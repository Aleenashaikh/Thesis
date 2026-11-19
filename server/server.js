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
const LOGIN_PIN = process.env.LOGIN_PIN || process.env.PIN || "7860";

// ---------- database ----------
const caseSchema = new mongoose.Schema(
  {
    imageUrl: String,
    publicId: String,
    modality: { type: String, enum: ["CT", "XRAY"] },
    width: Number,
    height: Number,
    status: {
      type: String,
      enum: ["pending", "analyzed", "reviewed"],
      default: "pending",
    },
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

// avoid "OverwriteModelError" when the module is reused between invocations
const Case = mongoose.models.Case || mongoose.model("Case", caseSchema);

// Cached connection: reused across serverless invocations, and never
// kills the process on failure (that would crash the function).
let dbPromise;
function connectDB() {
  if (!dbPromise) {
    dbPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((e) => {
        dbPromise = null;
        console.error("MongoDB connection failed:", e.message);
        throw e;
      });
  }
  return dbPromise;
}

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

// these two don't need the database
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/login", (req, res) => {
  const { pin } = req.body || {};
  if (!pin) {
    return res.status(400).json({ error: "PIN is required" });
  }
  if (String(pin).trim() === String(LOGIN_PIN).trim()) {
    return res.json({ ok: true, message: "Authentication successful" });
  }
  return res.status(401).json({ error: "Incorrect PIN. Please try again." });
});

// everything below needs MongoDB
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    next(e);
  }
});

app.post("/api/analyze", upload.single("image"), async (req, res) => {
  try {
    const modality = String(req.body.modality || "").toUpperCase();
    if (!["CT", "XRAY"].includes(modality)) return res.status(400).json({ error: "modality must be CT or XRAY" });
    if (!req.file) return res.status(400).json({ error: "no image uploaded" });

    // 1) Upload to Cloudinary FIRST (image is always persisted)
    const up = await uploadToCloudinary(req.file.buffer);

    // 2) Try to call the model service
    let result = null;
    let modelOnline = false;
    try {
      const form = new FormData();
      form.append("file", req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
      form.append("modality", modality);
      ({ data: result } = await axios.post(`${INFERENCE_URL}/analyze`, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 120000,
      }));
      modelOnline = true;
    } catch (_e) {
      // Model unavailable – we still save the case as pending
    }

    // 3) Save the case
    let doc;
    if (modelOnline && result) {
      const { width, height, modality: _m, ...rest } = result;
      doc = await Case.create({
        imageUrl: up.secure_url,
        publicId: up.public_id,
        modality,
        width,
        height,
        status: "analyzed",
        result: rest,
      });
    } else {
      doc = await Case.create({
        imageUrl: up.secure_url,
        publicId: up.public_id,
        modality,
        width: null,
        height: null,
        status: "pending",
        result: null,
      });
    }

    res.json({ ...doc.toObject(), modelOnline });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Re-try analysis on a pending case
app.post("/api/cases/:id/run-analysis", wrap(async (req, res) => {
  const doc = await Case.findById(req.params.id).catch(() => null);
  if (!doc) return res.status(404).json({ error: "not found" });
  if (doc.status !== "pending") return res.status(400).json({ error: "Case already analyzed" });

  // Download image from Cloudinary
  let imageResp;
  try {
    imageResp = await axios.get(doc.imageUrl, { responseType: "arraybuffer", timeout: 30000 });
  } catch (e) {
    return res.status(500).json({ error: `Failed to download image: ${e.message}` });
  }

  // Send to inference service
  const form = new FormData();
  form.append("file", Buffer.from(imageResp.data), { filename: "image.jpg", contentType: "image/jpeg" });
  form.append("modality", doc.modality);

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

  const { width, height, modality: _m, ...rest } = result;
  doc.width = width;
  doc.height = height;
  doc.result = rest;
  doc.status = "analyzed";
  await doc.save();

  res.json(doc);
}));

app.get("/api/cases", wrap(async (_req, res) => {
  res.json(await Case.find().sort({ createdAt: -1 }).limit(200));
}));

app.get("/api/cases/:id", async (req, res) => {
  const doc = await Case.findById(req.params.id).catch(() => null);
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

app.patch("/api/cases/:id/review", async (req, res) => {
  const { verdict, notes } = req.body;
  if (!["correct", "partly", "incorrect"].includes(verdict)) return res.status(400).json({ error: "bad verdict" });
  const doc = await Case.findByIdAndUpdate(
    req.params.id,
    {
      review: { verdict, notes: String(notes || "").slice(0, 2000), reviewedAt: new Date() },
      status: "reviewed",
    },
    { new: true }
  ).catch(() => null);
  if (!doc) return res.status(404).json({ error: "not found" });
  res.json(doc);
});

// Aggregated statistics
app.get("/api/stats", wrap(async (_req, res) => {
  const [totalCases, pending, analyzed, reviewed] = await Promise.all([
    Case.countDocuments(),
    Case.countDocuments({ status: "pending" }),
    Case.countDocuments({ status: "analyzed" }),
    Case.countDocuments({ status: "reviewed" }),
  ]);

  const [ctCount, xrayCount] = await Promise.all([
    Case.countDocuments({ modality: "CT" }),
    Case.countDocuments({ modality: "XRAY" }),
  ]);

  const stonesDetected = await Case.countDocuments({ "result.cls_flag": true });
  const noStones = await Case.countDocuments({ "result.cls_flag": false });

  const correctCount = await Case.countDocuments({ "review.verdict": "correct" });
  const partlyCount = await Case.countDocuments({ "review.verdict": "partly" });
  const incorrectCount = await Case.countDocuments({ "review.verdict": "incorrect" });

  const totalReviews = correctCount + partlyCount + incorrectCount;
  const modelAccuracy = totalReviews > 0 ? (correctCount / totalReviews) * 100 : null;
  const modelAgreement = totalReviews > 0 ? ((correctCount + partlyCount) / totalReviews) * 100 : null;

  const recentDocs = await Case.find().sort({ createdAt: -1 }).limit(5).lean();
  const recentCases = recentDocs.map((c) => ({
    _id: c._id,
    modality: c.modality,
    status: c.status,
    createdAt: c.createdAt,
    cls_flag: c.result?.cls_flag ?? null,
    verdict: c.review?.verdict ?? null,
  }));

  res.json({
    totalCases,
    pending,
    analyzed,
    reviewed,
    byModality: { CT: ctCount, XRAY: xrayCount },
    stonesDetected,
    noStones,
    reviewVerdicts: { correct: correctCount, partly: partlyCount, incorrect: incorrectCount },
    modelAccuracy,
    modelAgreement,
    recentCases,
  });
}));

// serve the built React app when running as a normal server (npm run build in /client)
const dist = path.join(__dirname, "..", "client", "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.use((err, _req, res, _next) => res.status(err.status || 400).json({ error: err.message }));

// Vercel imports this file and uses the exported app as the handler
module.exports = app;

// local dev / Render / Railway: start a normal server
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => app.listen(PORT, () => console.log("server up on", PORT)))
    .catch(() => process.exit(1));
}
