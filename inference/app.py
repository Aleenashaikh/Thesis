import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from model import Analyzer

MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "models"))
MAX_BYTES = 15 * 1024 * 1024

app = FastAPI(title="Kidney stone inference")
analyzer = Analyzer(MODEL_DIR)


@app.get("/health")
def health():
    return {"ok": True, "classifier": analyzer.backbone, "detector": analyzer.sel.get("yolo_name")}


@app.post("/analyze")
def analyze(file: UploadFile = File(...), modality: str = Form(...)):
    data = file.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "image larger than 15 MB")
    try:
        return analyzer.analyze(data, modality)
    except ValueError as e:
        raise HTTPException(400, str(e))
