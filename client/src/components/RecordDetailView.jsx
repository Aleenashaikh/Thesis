import { useState, useEffect } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Maximize2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Sliders,
  Calendar,
  Save,
  Tag,
  FileCheck,
} from "lucide-react";
import BoxedImage from "./BoxedImage";
import ImageModal from "./ImageModal";

export default function RecordDetailView({
  record,
  allRecords = [],
  onBack,
  onSelectRecord,
  onReviewSaved,
  apiCall,
}) {
  const [viewMode, setViewMode] = useState("side-by-side"); // "side-by-side" | "detected" | "original"
  const [showBoxes, setShowBoxes] = useState(true);
  const [showConfidence, setShowConfidence] = useState(true);
  const [hoveredBoxIdx, setHoveredBoxIdx] = useState(null);
  const [modalImage, setModalImage] = useState(null); // { src, boxes, title }
  const [copiedId, setCopiedId] = useState(false);

  // Review Form state
  const [verdict, setVerdict] = useState(record.review?.verdict || "");
  const [notes, setNotes] = useState(record.review?.notes || "");
  const [saveStatus, setSaveStatus] = useState({ state: "idle", msg: "" }); // idle | saving | success | error

  // Reset form when record changes
  useEffect(() => {
    setVerdict(record.review?.verdict || "");
    setNotes(record.review?.notes || "");
    setSaveStatus({ state: "idle", msg: "" });
  }, [record._id]);

  // Find index for Prev/Next navigation
  const currentIndex = allRecords.findIndex((r) => r._id === record._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allRecords.length - 1;

  function goPrev() {
    if (hasPrev) onSelectRecord(allRecords[currentIndex - 1]);
  }

  function goNext() {
    if (hasNext) onSelectRecord(allRecords[currentIndex + 1]);
  }

  function copyCaseId() {
    navigator.clipboard.writeText(record._id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  async function handleSaveReview() {
    if (!verdict) return;
    setSaveStatus({ state: "saving", msg: "Saving clinical review..." });
    try {
      const updated = await apiCall(`/cases/${record._id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, notes }),
      });
      setSaveStatus({ state: "success", msg: "Review successfully saved!" });
      if (onReviewSaved) onReviewSaved(updated);
      setTimeout(() => setSaveStatus({ state: "idle", msg: "" }), 3000);
    } catch (err) {
      setSaveStatus({ state: "error", msg: err.message || "Failed to save review" });
    }
  }

  function appendNotePreset(presetText) {
    setNotes((prev) => (prev ? `${prev} · ${presetText}` : presetText));
  }

  const result = record.result || {
    boxes: [],
    p_stone: 0,
    cls_flag: false,
    models: {},
  };
  const boxes = result.boxes || [];

  return (
    <div className="record-detail-layout">
      {/* Top Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-nav-left">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={16} />
            <span>All Records</span>
          </button>

          <div className="record-meta-pill">
            <span className="meta-label">Case ID:</span>
            <code className="meta-id">{record._id}</code>
            <button
              className="copy-id-btn"
              onClick={copyCaseId}
              title="Copy Case ID"
            >
              {copiedId ? <Check size={14} className="text-success" /> : <Copy size={14} />}
            </button>
          </div>

          <span className={`modality-badge ${record.modality === "XRAY" ? "badge-xray" : "badge-ct"}`}>
            {record.modality === "XRAY" ? "X-Ray (KUB)" : "CT Slice"}
          </span>

          <span className="record-date-pill">
            <Calendar size={14} />
            <span>{new Date(record.createdAt).toLocaleDateString()} {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>

        {/* Case Navigation: Prev / Next */}
        <div className="detail-nav-right">
          <div className="case-indexer">
            Case <strong>{currentIndex >= 0 ? currentIndex + 1 : 1}</strong> of <strong>{allRecords.length}</strong>
          </div>
          <button
            className="btn-paged"
            disabled={!hasPrev}
            onClick={goPrev}
            title="Previous Case"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="btn-paged"
            disabled={!hasNext}
            onClick={goNext}
            title="Next Case"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout: Visual Scans (Left/Center) + Review Panel (Right) */}
      <div className="detail-content-grid">
        {/* ======================================================== */}
        {/* LEFT / CENTER: ORIGINAL & DETECTED RADIOGRAPHS           */}
        {/* ======================================================== */}
        <div className="visual-comparison-column">
          {/* View Toolbar */}
          <div className="comparison-toolbar">
            <div className="view-mode-tabs">
              <button
                className={`view-mode-btn ${viewMode === "side-by-side" ? "active" : ""}`}
                onClick={() => setViewMode("side-by-side")}
              >
                <Layers size={15} />
                <span className="tab-label-full">Original & Detected (Both)</span>
                <span className="tab-label-short">Both Scans</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === "detected" ? "active" : ""}`}
                onClick={() => setViewMode("detected")}
              >
                <Sparkles size={15} />
                <span className="tab-label-full">Detected Only</span>
                <span className="tab-label-short">Detected</span>
              </button>
              <button
                className={`view-mode-btn ${viewMode === "original" ? "active" : ""}`}
                onClick={() => setViewMode("original")}
              >
                <Eye size={15} />
                <span className="tab-label-full">Original Only</span>
                <span className="tab-label-short">Original</span>
              </button>
            </div>

            <div className="view-controls-right">
              {viewMode !== "original" && (
                <>
                  <button
                    className={`toggle-pill ${showBoxes ? "active" : ""}`}
                    onClick={() => setShowBoxes(!showBoxes)}
                    title="Toggle bounding boxes"
                  >
                    {showBoxes ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>Boxes ({boxes.length})</span>
                  </button>
                  <button
                    className={`toggle-pill ${showConfidence ? "active" : ""}`}
                    onClick={() => setShowConfidence(!showConfidence)}
                    title="Toggle confidence labels"
                  >
                    <span>Confidence</span>
                  </button>
                </>
              )}

              <button
                className="icon-btn-tool"
                onClick={() =>
                  setModalImage({
                    src: record.imageUrl,
                    width: record.width,
                    height: record.height,
                    boxes: boxes,
                    title: `Case #${record._id.slice(-6)} · Full Examination`,
                  })
                }
                title="Fullscreen Radiograph Inspection"
              >
                <Maximize2 size={16} />
                <span>Inspect</span>
              </button>
            </div>
          </div>

          {/* Dual Image Grid (Both Original and Detected) */}
          <div className={`scans-display-container layout-${viewMode}`}>
            {/* 1. ORIGINAL SCAN */}
            {(viewMode === "side-by-side" || viewMode === "original") && (
              <div className="scan-card">
                <div className="scan-card-header">
                  <div className="scan-card-title-group">
                    <span className="scan-card-title">Original Scan</span>
                    <span className="scan-pill original-pill">Raw Radiograph</span>
                  </div>
                  <span className="scan-resolution-tag">
                    {record.width} × {record.height} px
                  </span>
                </div>

                <div className="scan-image-viewport">
                  <img
                    src={record.imageUrl}
                    alt="Original raw scan"
                    className="original-clean-img"
                  />
                </div>

                <div className="scan-card-footer">
                  <span className="footer-note">Clean clinical radiograph without overlay annotations.</span>
                  <button
                    className="text-btn-zoom"
                    onClick={() =>
                      setModalImage({
                        src: record.imageUrl,
                        width: record.width,
                        height: record.height,
                        boxes: [],
                        title: `Case #${record._id.slice(-6)} · Original Raw Scan`,
                      })
                    }
                  >
                    <Maximize2 size={13} />
                    <span>Zoom Raw</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. DETECTED SCAN */}
            {(viewMode === "side-by-side" || viewMode === "detected") && (
              <div className="scan-card">
                <div className="scan-card-header">
                  <div className="scan-card-title-group">
                    <span className="scan-card-title">Detected Scan</span>
                    <span className="scan-pill detected-pill">AI Detection Overlay</span>
                  </div>
                  <span className={`detection-count-pill ${boxes.length > 0 ? "has-stones" : "no-stones"}`}>
                    {boxes.length} {boxes.length === 1 ? "Calculus Localized" : "Calculi Localized"}
                  </span>
                </div>

                <div className="scan-image-viewport">
                  <BoxedImage
                    src={record.imageUrl}
                    width={record.width}
                    height={record.height}
                    boxes={boxes}
                    showBoxes={showBoxes}
                    showConfidence={showConfidence}
                    activeBoxIndex={hoveredBoxIdx}
                    onHoverBox={setHoveredBoxIdx}
                  />
                </div>

                <div className="scan-card-footer">
                  <span className="footer-note">
                    {boxes.length > 0
                      ? `Bounding boxes generated by YOLO11s detector at threshold ${(result.det_threshold || 0.165).toFixed(2)}`
                      : "No candidate bounding boxes surpassed confidence threshold"}
                  </span>
                  <button
                    className="text-btn-zoom"
                    onClick={() =>
                      setModalImage({
                        src: record.imageUrl,
                        width: record.width,
                        height: record.height,
                        boxes: boxes,
                        title: `Case #${record._id.slice(-6)} · AI Detected Scan`,
                      })
                    }
                  >
                    <Maximize2 size={13} />
                    <span>Zoom Detected</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: SPECIALIST REVIEW & AI DIAGNOSTICS         */}
        {/* ======================================================== */}
        <aside className="review-and-telemetry-column">
          {/* Review Card */}
          <div className="review-panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <FileCheck size={18} className="text-primary" />
                <h3 className="panel-title">Urologist / Specialist Review</h3>
              </div>
              {record.review?.reviewedAt && (
                <span className="review-timestamp-badge">
                  <Clock size={12} />
                  <span>Reviewed</span>
                </span>
              )}
            </div>

            <div className="panel-body">
              <p className="panel-instructions">
                Validate the AI localization and classification. Record clinical observations for audit and quality assurance.
              </p>

              {/* Verdict Selector Options */}
              <div className="verdict-options-grid">
                <label
                  className={`verdict-choice-card ${
                    verdict === "correct" ? "selected verdict-correct" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="verdict"
                    value="correct"
                    checked={verdict === "correct"}
                    onChange={() => setVerdict("correct")}
                  />
                  <div className="verdict-icon-wrap">
                    <CheckCircle2 size={18} />
                  </div>
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Correct</span>
                    <span className="verdict-hint">Accurate localization</span>
                  </div>
                </label>

                <label
                  className={`verdict-choice-card ${
                    verdict === "partly" ? "selected verdict-partly" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="verdict"
                    value="partly"
                    checked={verdict === "partly"}
                    onChange={() => setVerdict("partly")}
                  />
                  <div className="verdict-icon-wrap">
                    <AlertTriangle size={18} />
                  </div>
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Partly Correct</span>
                    <span className="verdict-hint">Minor boundary/count shift</span>
                  </div>
                </label>

                <label
                  className={`verdict-choice-card ${
                    verdict === "incorrect" ? "selected verdict-incorrect" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="verdict"
                    value="incorrect"
                    checked={verdict === "incorrect"}
                    onChange={() => setVerdict("incorrect")}
                  />
                  <div className="verdict-icon-wrap">
                    <AlertCircle size={18} />
                  </div>
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Incorrect</span>
                    <span className="verdict-hint">False positive / missed</span>
                  </div>
                </label>
              </div>

              {/* Quick Tag Helper Chips */}
              <div className="quick-tags-section">
                <div className="quick-tags-label">
                  <Tag size={13} />
                  <span>Clinical remark presets:</span>
                </div>
                <div className="tags-wrap">
                  {[
                    "Accurate localization",
                    "Missed calculus",
                    "Bowel gas artifact",
                    "Phlebolith confusion",
                    "Small stone (<3mm)",
                    "Sub-optimal contrast",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="preset-chip"
                      onClick={() => appendNotePreset(tag)}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Textarea */}
              <div className="notes-group">
                <label className="input-label" htmlFor="review-notes">
                  Specialist Clinical Notes
                </label>
                <textarea
                  id="review-notes"
                  className="modern-textarea"
                  placeholder="Record anatomical location (e.g. proximal ureter, lower pole), calculus size, false positives, or specific notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <div className="textarea-footer">
                  <span className="char-count">{notes.length} / 2000 chars</span>
                </div>
              </div>

              {/* Save Review Button & Status */}
              <div className="review-action-row">
                <button
                  className="btn-save-review"
                  disabled={!verdict || saveStatus.state === "saving"}
                  onClick={handleSaveReview}
                >
                  <Save size={16} />
                  <span>
                    {saveStatus.state === "saving" ? "Saving Review..." : "Save Clinical Review"}
                  </span>
                </button>

                {saveStatus.state === "success" && (
                  <div className="save-feedback success">
                    <CheckCircle2 size={16} />
                    <span>{saveStatus.msg}</span>
                  </div>
                )}
                {saveStatus.state === "error" && (
                  <div className="save-feedback error">
                    <AlertCircle size={16} />
                    <span>{saveStatus.msg}</span>
                  </div>
                )}
              </div>

              {record.review?.reviewedAt && (
                <div className="previous-review-info">
                  <span>
                    Last recorded:{" "}
                    <strong>{new Date(record.review.reviewedAt).toLocaleString()}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* AI Diagnostics & Model Telemetry Card */}
          <div className="telemetry-panel-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <Sparkles size={16} className="text-primary" />
                <h4 className="panel-title-sm">AI Model Telemetry</h4>
              </div>
            </div>

            <div className="telemetry-body">
              {/* Classification Stat */}
              <div className="telemetry-metric-item">
                <div className="metric-header">
                  <span className="metric-name">Classifier Decision</span>
                  <span
                    className={`metric-pill ${
                      result.cls_flag ? "metric-flag-positive" : "metric-flag-negative"
                    }`}
                  >
                    {result.cls_flag ? "Stone Suspected" : "No Stone Suspected"}
                  </span>
                </div>
                <div className="prob-bar-container">
                  <div
                    className={`prob-bar-fill ${result.cls_flag ? "fill-positive" : "fill-negative"}`}
                    style={{ width: `${Math.min(100, (result.p_stone || 0) * 100)}%` }}
                  />
                </div>
                <div className="metric-subtext">
                  <span>Calibrated Probability: <strong>{((result.p_stone || 0) * 100).toFixed(1)}%</strong></span>
                  <span>Threshold: {(result.cls_threshold || 0).toFixed(3)}</span>
                </div>
              </div>

              {/* Detected Boxes List */}
              <div className="telemetry-metric-item">
                <div className="metric-header">
                  <span className="metric-name">Detected Regions of Interest</span>
                  <span className="metric-val">{boxes.length} localized</span>
                </div>

                {boxes.length > 0 ? (
                  <div className="boxes-breakdown-list">
                    {boxes.map((b, idx) => (
                      <div
                        key={idx}
                        className={`box-item-row ${hoveredBoxIdx === idx ? "hovered" : ""}`}
                        onMouseEnter={() => setHoveredBoxIdx(idx)}
                        onMouseLeave={() => setHoveredBoxIdx(null)}
                      >
                        <div className="box-item-title">
                          <span className="box-item-badge">#{idx + 1}</span>
                          <span className="box-conf-text">
                            Confidence: <strong>{(b.conf * 100).toFixed(1)}%</strong>
                          </span>
                        </div>
                        <div className="box-coords-text">
                          [{Math.round(b.x1)}, {Math.round(b.y1)}] to [{Math.round(b.x2)}, {Math.round(b.y2)}]
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-boxes-text">No bounding boxes detected above threshold.</p>
                )}
              </div>

              {/* Model Specs */}
              <div className="model-specs-footer">
                <div className="spec-row">
                  <span className="spec-label">Classifier:</span>
                  <span className="spec-value">{result.models?.classifier || "tf_efficientnetv2_s"}</span>
                </div>
                <div className="spec-row">
                  <span className="spec-label">Detector:</span>
                  <span className="spec-value">{result.models?.detector || "yolo11s_960_synth_s1"}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen Inspection Modal */}
      {modalImage && (
        <ImageModal
          isOpen={!!modalImage}
          onClose={() => setModalImage(null)}
          src={modalImage.src}
          width={modalImage.width}
          height={modalImage.height}
          boxes={modalImage.boxes}
          title={modalImage.title}
          modality={record.modality}
        />
      )}
    </div>
  );
}
