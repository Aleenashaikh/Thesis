"""Inference code that mirrors the notebook's analyze(image, modality).

Preprocessing for the classifier (identical to the training notebook):
percentile clip -> CLAHE -> square crop -> resize 256 -> ImageNet normalisation.
"""
import json
import threading
from pathlib import Path

import cv2
import numpy as np
import timm
import torch
import torch.nn as nn
from ultralytics import YOLO

IMG_SIZE = 256
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def percentile_clip(img):
    img = img.astype(np.float32)
    gray = img.mean(axis=2) if img.ndim == 3 else img
    lo, hi = np.percentile(gray, [1, 99])
    if not np.isfinite(lo) or not np.isfinite(hi) or hi - lo < 1e-6:
        return np.clip(img, 0, 255).astype(np.uint8)
    img = np.clip(img, lo, hi)
    img = (img - lo) / (hi - lo) * 255.0
    return img.astype(np.uint8)


def clahe(img):
    lab = cv2.cvtColor(img, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    l = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(l)
    return cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2RGB)


def center_crop_square(img):
    h, w = img.shape[:2]
    side = min(h, w)
    y0, x0 = (h - side) // 2, (w - side) // 2
    return img[y0:y0 + side, x0:x0 + side]


def letterbox_square(img):
    h, w = img.shape[:2]
    if h == w:
        return img
    side = max(h, w)
    fill = np.median(img.reshape(-1, img.shape[2]), axis=0)
    out = np.empty((side, side, img.shape[2]), dtype=img.dtype)
    out[:] = fill
    y0, x0 = (side - h) // 2, (side - w) // 2
    out[y0:y0 + h, x0:x0 + w] = img
    return out


class UnifiedStoneNet(nn.Module):
    """Single encoder + modality embedding + one stone head (same as the notebook)."""

    def __init__(self, backbone, embed_dim=32):
        super().__init__()
        self.encoder = timm.create_model(backbone, pretrained=False, num_classes=0)
        self.modality_emb = nn.Embedding(2, embed_dim)
        self.head = nn.Sequential(nn.Dropout(0.3), nn.Linear(self.encoder.num_features + embed_dim, 1))

    def forward(self, x, modality_id):
        return self.head(torch.cat([self.encoder(x), self.modality_emb(modality_id)], dim=1)).squeeze(1)


def _logit(p):
    p = np.clip(p, 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


class Analyzer:
    def __init__(self, model_dir):
        d = Path(model_dir)
        self.sel = json.load(open(d / "selected_models.json"))

        cls_files = sorted(d.glob("cls_*.pt"))
        if not cls_files:
            raise FileNotFoundError(f"No cls_*.pt classifier checkpoint in {d}")
        ckpt = torch.load(cls_files[0], map_location="cpu", weights_only=False)  # your own file
        backbone = ckpt.get("backbone", self.sel.get("cls_backbone", "tf_efficientnetv2_s"))
        self.crop_mode = ckpt.get("crop_mode", self.sel.get("crop_mode", "center"))
        self.cls = UnifiedStoneNet(backbone)
        self.cls.load_state_dict(ckpt["state_dict"] if "state_dict" in ckpt else ckpt)
        self.cls.eval()
        self.backbone = backbone

        yolo_path = d / "best.pt"
        if not yolo_path.exists():
            raise FileNotFoundError(f"{yolo_path} not found (the selected detector's weights/best.pt)")
        self.yolo = YOLO(str(yolo_path))
        self.yolo_imgsz = int(self.sel.get("yolo_imgsz", 960))

        self.cls_thr = self.sel["cls_thr"]            # per-modality, on the RAW probability
        self.cls_T = self.sel.get("cls_T", {})        # temperature per modality (calibration)
        self.det_thr = self._detector_thresholds(d)
        self.lock = threading.Lock()

    def _detector_thresholds(self, d):
        thr = self.sel.get("det_thr")
        if thr:
            return {k: float(v) for k, v in thr.items()}
        # fall back to the detector run table
        csv = d / "yolo_runs.csv"
        if csv.exists():
            import csv as _csv
            for row in _csv.DictReader(open(csv)):
                if row.get("name") == self.sel.get("yolo_name"):
                    try:
                        return {"CT": float(row["thr_CT"]), "XRAY": float(row["thr_XRAY"])}
                    except (KeyError, ValueError):
                        pass
        print("WARNING: detector thresholds not found, using 0.25 for both modalities")
        return {"CT": 0.25, "XRAY": 0.25}

    def _prepare(self, rgb):
        rgb = clahe(percentile_clip(rgb))
        rgb = letterbox_square(rgb) if self.crop_mode == "letterbox" else center_crop_square(rgb)
        rgb = cv2.resize(rgb, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LINEAR)
        x = (rgb.astype(np.float32) / 255.0 - MEAN) / STD
        return torch.from_numpy(x.transpose(2, 0, 1)).unsqueeze(0)

    def analyze(self, image_bytes, modality):
        modality = modality.upper().replace("-", "").replace(" ", "")
        if modality not in ("CT", "XRAY"):
            raise ValueError("modality must be CT or XRAY")
        bgr = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)
        if bgr is None:
            raise ValueError("could not decode the image (use JPG or PNG)")
        h, w = bgr.shape[:2]

        with self.lock, torch.no_grad():
            res = self.yolo.predict(source=bgr, conf=self.det_thr[modality], imgsz=self.yolo_imgsz,
                                    max_det=100, verbose=False, device="cpu")[0]
            boxes = []
            if res.boxes is not None and len(res.boxes):
                for (x1, y1, x2, y2), c in zip(res.boxes.xyxy.cpu().numpy().tolist(),
                                               res.boxes.conf.cpu().numpy().tolist()):
                    boxes.append({"x1": x1, "y1": y1, "x2": x2, "y2": y2, "conf": float(c)})
            boxes.sort(key=lambda b: -b["conf"])

            x = self._prepare(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            mid = torch.tensor([0 if modality == "CT" else 1])
            p_raw = float(torch.sigmoid(self.cls(x, mid)).item())

        T = self.cls_T.get(modality)
        p_cal = float(1.0 / (1.0 + np.exp(-_logit(np.array([p_raw]))[0] / float(T)))) if T else p_raw
        thr = float(self.cls_thr[modality])
        return {
            "modality": modality,
            "width": w,
            "height": h,
            "p_stone": p_cal,
            "p_stone_raw": p_raw,
            "cls_threshold": thr,
            "cls_flag": bool(p_raw >= thr),
            "boxes": boxes,
            "det_threshold": self.det_thr[modality],
            "models": {"classifier": self.backbone, "detector": self.sel.get("yolo_name")},
        }
