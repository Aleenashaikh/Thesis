import { useState, useRef } from "react";
import {
  UploadCloud,
  FileImage,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  FileCheck,
  Cpu,
  Info,
} from "lucide-react";
import BoxedImage from "./BoxedImage";

export default function UploadScreen({
  onAnalyzeSuccess,
  onGoToRecord,
  apiCall,
}) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [modality, setModality] = useState("XRAY");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [lastAnalysis, setLastAnalysis] = useState(null);
  const fileInputRef = useRef(null);

  function handleFileSelected(selectedFile) {
    if (!selectedFile) return;
    if (!/^image\/(jpeg|png)$/.test(selectedFile.type)) {
      setError("Please choose a valid JPG or PNG image file.");
      return;
    }
    if (selectedFile.size > 15 * 1024 * 1024) {
      setError("File size exceeds 15MB maximum limit.");
      return;
    }

    setFile(selectedFile);
    setError("");
    setLastAnalysis(null);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  }

  function handleClearFile() {
    setFile(null);
    setPreviewUrl("");
    setLastAnalysis(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAnalyze() {
    if (!file) return;
    setIsAnalyzing(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("modality", modality);

      const result = await apiCall("/analyze", {
        method: "POST",
        body: formData,
      });

      setLastAnalysis(result);
      if (onAnalyzeSuccess) {
        onAnalyzeSuccess(result);
      }
    } catch (err) {
      setError(err.message || "Detection failed. Please check your network connection.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  return (
    <div className="screen-container">
      {/* Hero Header */}
      <div className="section-hero">
        <div className="section-badge">
          <Sparkles size={14} />
          <span>Screen 1: Upload & Inference</span>
        </div>
        <h1 className="section-title">Upload & Detect Kidney Calculi</h1>
        <p className="section-subtitle">
          Upload medical radiographs or computed tomography slices for automated localization and classification of kidney stones.
        </p>
      </div>

      <div className="upload-layout-grid">
        {/* Left Column: Upload Form & Configuration */}
        <div className="upload-config-card">
          {/* Step 1: Modality Selection */}
          <div className="config-group">
            <label className="config-label">
              <span className="step-num">1</span> Select Scan Modality
            </label>
            <div className="modality-selector-grid">
              <button
                type="button"
                className={`modality-card-btn ${modality === "XRAY" ? "selected" : ""}`}
                onClick={() => setModality("XRAY")}
              >
                <div className="modality-card-icon">🩺</div>
                <div className="modality-card-content">
                  <span className="modality-name">X-Ray (KUB) </span>
                  <span className="modality-desc">Kidney-Ureter-Bladder radiograph</span>
                </div>
                <div className="radio-dot" />
              </button>

              <button
                type="button"
                className={`modality-card-btn ${modality === "CT" ? "selected" : ""}`}
                onClick={() => setModality("CT")}
              >
                <div className="modality-card-icon">🩺</div>
                <div className="modality-card-content">
                  <span className="modality-name">CT Slice </span>
                  <span className="modality-desc">Abdominal/Pelvic axial or coronal scan</span>
                </div>
                <div className="radio-dot" />
              </button>
            </div>
          </div>

          {/* Step 2: File Upload Zone */}
          <div className="config-group">
            <label className="config-label">
              <span className="step-num">2</span> Upload Diagnostic Image
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => handleFileSelected(e.target.files[0])}
              style={{ display: "none" }}
            />

            {!file ? (
              <div
                className={`dropzone ${isDragging ? "dropzone-active" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <div className="dropzone-icon-circle">
                  <UploadCloud size={32} />
                </div>
                <div className="dropzone-instructions">
                  <strong>Click to select</strong> or drag and drop radiograph here
                </div>
                <p className="dropzone-hints">
                  Supported formats: JPEG, PNG · Maximum file size: 15MB
                </p>
                <button
                  type="button"
                  className="btn-browse"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current && fileInputRef.current.click();
                  }}
                >
                  Browse Files
                </button>
              </div>
            ) : (
              <div className="selected-file-strip">
                <div className="selected-file-icon">
                  <FileImage size={24} />
                </div>
                <div className="selected-file-meta">
                  <span className="selected-file-name">{file.name}</span>
                  <span className="selected-file-details">
                    {formatBytes(file.size)} · {modality === "XRAY" ? "X-Ray Mode" : "CT Mode"}
                  </span>
                </div>
                <button
                  className="icon-btn-danger"
                  onClick={handleClearFile}
                  title="Remove image"
                >
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert-banner alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Run Analysis Action */}
          <div className="config-group">
            <button
              className={`btn-analyze ${isAnalyzing ? "loading" : ""}`}
              disabled={!file || isAnalyzing}
              onClick={handleAnalyze}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={18} className="spin-icon" />
                  <span>Processing Scan with AI Models...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Analyze & Detect Calculi</span>
                </>
              )}
            </button>
            <p className="analyze-caption">
              Runs dual-stage inference: EfficientNetV2 Classifier + YOLO11s Detector
            </p>
          </div>

          {/* Clinical Guidance Box */}
          <div className="clinical-guidance-card">
            <div className="guidance-header">
              <Info size={16} />
              <span>Best Practices for Imaging Accuracy</span>
            </div>
            <ul className="guidance-list">
              <li>Upload high-contrast full-resolution radiograph or slice.</li>
              <li>Ensure patient identifiers (PHI) are anonymized before uploading.</li>
              <li>Dual-energy or contrast-enhanced scans may produce artifacts.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Dynamic Preview or Completed Result */}
        <div className="upload-preview-card">
          <div className="card-header-bar">
            <span className="card-header-title">
              {lastAnalysis ? "Detection Output" : previewUrl ? "Scan Preview" : "Image Viewport"}
            </span>
            {file && (
              <span className="viewport-status-badge">
                {lastAnalysis ? "Analyzed" : "Ready for Analysis"}
              </span>
            )}
          </div>

          <div className="preview-viewport-content">
            {lastAnalysis ? (
              <div className="analysis-result-container">
                {/* Result Summary Banner */}
                <div
                  className={`result-verdict-banner ${
                    lastAnalysis.result.cls_flag ? "banner-positive" : "banner-negative"
                  }`}
                >
                  <div className="banner-icon-col">
                    {lastAnalysis.result.cls_flag ? (
                      <AlertCircle size={28} />
                    ) : (
                      <CheckCircle2 size={28} />
                    )}
                  </div>
                  <div className="banner-details-col">
                    <span className="banner-title">
                      {lastAnalysis.result.cls_flag
                        ? "Calculus Detected / Suspected"
                        : "No Calculus Suspected"}
                    </span>
                    <span className="banner-subtitle">
                      Model probability:{" "}
                      <strong>{(lastAnalysis.result.p_stone * 100).toFixed(1)}%</strong>
                      {" · "}
                      Detected boxes:{" "}
                      <strong>{lastAnalysis.result.boxes.length}</strong>
                    </span>
                  </div>
                  <button
                    className="btn-view-record"
                    onClick={() => onGoToRecord(lastAnalysis._id)}
                  >
                    <span>Open Case & Review</span>
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Boxed Image Presentation */}
                <div className="viewport-image-box">
                  <BoxedImage
                    src={lastAnalysis.imageUrl}
                    width={lastAnalysis.width}
                    height={lastAnalysis.height}
                    boxes={lastAnalysis.result.boxes}
                    showBoxes={true}
                    showConfidence={true}
                  />
                </div>

                {/* Quick Action Footer */}
                <div className="result-quick-actions">
                  <button className="btn-secondary" onClick={handleClearFile}>
                    <RefreshCw size={15} />
                    <span>Upload Another Scan</span>
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => onGoToRecord(lastAnalysis._id)}
                  >
                    <FileCheck size={16} />
                    <span>Go to Record & Specialist Review</span>
                  </button>
                </div>
              </div>
            ) : previewUrl ? (
              <div className="viewport-image-box">
                <img src={previewUrl} alt="Preview" className="raw-preview-img" />
              </div>
            ) : (
              <div className="viewport-empty-state">
                <div className="empty-state-icon">
                  <Cpu size={40} />
                </div>
                <h3>No Scan Selected</h3>
                <p>
                  Choose or drag a radiograph into the upload panel to view the preview and initiate AI stone detection.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
