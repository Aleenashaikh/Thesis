require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const axios = require("axios");
const FormData = require("form-data");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const INFERENCE_URL = process.env.INFERENCE_URL || "http://localhost:8000";
const PASSCODE = process.env.PASSCODE || "";

// ---------- database ----------
const caseSchema = new mongoose.Schema(
  {
    imageUrl: String,
    publicId: String,
    modality: { type: String, enum: ["CT", "XRAY"] },
    width: Number,
    height: Number,
    result: {
      p_stone: Number,
      p_stone_raw: Number,
      cls_threshold: Number,
      cls_flag: Boolean,
      det_threshold: Number,
      boxes: [{ x1: Number, y1: Number, x2: Number, y2: Number, conf: Number, _id: false }],
      models: { classifier: String, detector: String },
    },
    review: {
      verdict: { type: String, enum: ["correct", "partly", "incorrect", null], default: null },
      notes: { type: String, default: "" },
      reviewedAt: Date,
    },
  },
  { timestamps: true }
);
const Case = mongoose.model("Case", caseSchema);

// ---------- app ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    cb(/^image\/(jpeg|png)$/.test(file.mimetype) ? null : new Error("Only JPG or PNG images"), true),
});

function requirePasscode(req, res, next) {
  if (!PASSCODE) return next();
  if (req.get("x-passcode") === PASSCODE) return next();
  res.status(401).json({ error: "Wrong or missing passcode" });
}

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: "kidney-stone", resource_type: "image" }, (err, out) =>
        err ? reject(err) : resolve(out)
      )
      .end(buffer);
  });
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/analyze", requirePasscode, upload.single("image"), async (req, res) => {
  try {
    const modality = String(req.body.modality || "").toUpperCase();
    if (!["CT", "XRAY"].includes(modality)) return res.status(400).json({ error: "modality must be CT or XRAY" });
    if (!req.file) return res.status(400).json({ error: "no image uploaded" });

    // 1) run the model
    const form = new FormData();
    form.append("file", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    form.append("modality", modality);
    let result;
    try {
      ({ data: result } = await axios.post(`${INFERENCE_URL}/analyze`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }));
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      return res.status(502).json({ error: `Model service: ${msg}` });
    }

    // 2) store the original image on Cloudinary
    const up = await uploadToCloudinary(req.file.buffer);

    // 3) save the case
    const { width, height, modality: _m, ...rest } = result;
    const doc = await Case.create({
      imageUrl: up.secure_url,
      publicId: up.public_id,
      modality,
      width,
      height,
      result: rest,
    });
    res.json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/cases", requirePasscode, wrap(async (_req, res) => {
  res.json(await Case.find().sort({ createdAt: -1 }).limit(50));
}));

app.get("/api/cases/:id", requirePasscode, async (req, res) => {
  const doc = await Case.findById(req.params.id).catch(() => null);
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

app.patch("/api/cases/:id/review", requirePasscode, async (req, res) => {
  const { verdict, notes } = req.body;
  if (!["correct", "partly", "incorrect"].includes(verdict)) return res.status(400).json({ error: "bad verdict" });
  const doc = await Case.findByIdAndUpdate(
    req.params.id,
    { review: { verdict, notes: String(notes || "").slice(0, 2000), reviewedAt: new Date() } },
    { new: true }
  ).catch(() => null);
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

// serve the built React app in production (npm run build in /client)
const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => res.status(err.status || 400).json({ error: err.message }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => app.listen(process.env.PORT || 5000, () => console.log("server up on", process.env.PORT || 5000)))
  .catch((e) => {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  });
