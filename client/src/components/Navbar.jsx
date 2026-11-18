import { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  Lock,
  KeyRound,
  ShieldAlert,
  Activity,
  CheckCircle2,
  X,
  ChevronDown,
} from "lucide-react";

export default function Navbar({
  currentScreen,
  setCurrentScreen,
  recordsCount = 0,
  passcode,
  setPasscode,
  onRefreshRecords,
}) {
  const [showPassModal, setShowPassModal] = useState(false);
  const [tempPass, setTempPass] = useState(passcode);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  function handleSavePass(e) {
    e.preventDefault();
    setPasscode(tempPass);
    sessionStorage.setItem("passcode", tempPass);
    setShowPassModal(false);
    onRefreshRecords();
  }

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          {/* Brand */}
          <div className="brand" onClick={() => setCurrentScreen("upload")}>
            <div className="brand-icon">
              <Activity size={22} className="pulse-icon" />
            </div>
            <div className="brand-text">
              <span className="brand-name">LithoScan <span className="brand-highlight">AI</span></span>
              <span className="brand-tag">Kidney Stone Detection & Review</span>
            </div>
          </div>

          {/* Navigation Screens Switcher */}
          <nav className="nav-tabs" aria-label="Main Navigation">
            <button
              className={`nav-tab-btn ${currentScreen === "upload" ? "active" : ""}`}
              onClick={() => setCurrentScreen("upload")}
            >
              <UploadCloud size={18} />
              <span>Upload Scan</span>
            </button>

            <button
              className={`nav-tab-btn ${currentScreen === "records" ? "active" : ""}`}
              onClick={() => setCurrentScreen("records")}
            >
              <FileSpreadsheet size={18} />
              <span>Case Records</span>
              {recordsCount > 0 && (
                <span className="tab-counter-badge">{recordsCount}</span>
              )}
            </button>
          </nav>

          {/* Right Tools: Passcode & Notice */}
          <div className="header-actions">
            <button
              className="disclaimer-trigger-btn"
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              title="Toggle Research Disclaimer"
            >
              <ShieldAlert size={15} />
              <span className="hide-on-mobile">Clinical Protocol</span>
            </button>

            <button
              className={`passcode-pill-btn ${passcode ? "unlocked" : "locked"}`}
              onClick={() => {
                setTempPass(passcode);
                setShowPassModal(true);
              }}
              title="Passcode Settings"
            >
              {passcode ? <KeyRound size={15} /> : <Lock size={15} />}
              <span className="hide-on-mobile">{passcode ? "Unlocked" : "Set Passcode"}</span>
            </button>
          </div>
        </div>

        {/* Collapsible Disclaimer Ribbon */}
        {showDisclaimer && (
          <div className="clinical-notice-bar">
            <div className="notice-inner">
              <ShieldAlert size={16} className="notice-icon" />
              <p>
                <strong>Research Prototype:</strong> AI inference powered by EfficientNetV2 classifier & YOLO11s detector.
                Designed for clinical peer review only. Not for standalone clinical diagnosis or unverified patient treatment. Ensure all uploaded scans are de-identified.
              </p>
              <button
                className="notice-close-btn"
                onClick={() => setShowDisclaimer(false)}
                aria-label="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Passcode Modal */}
      {showPassModal && (
        <div className="modal-backdrop" onClick={() => setShowPassModal(false)}>
          <div className="passcode-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <KeyRound size={18} className="text-primary" />
                <span className="modal-title">System Access Passcode</span>
              </div>
              <button className="icon-btn close-btn" onClick={() => setShowPassModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePass} className="passcode-form">
              <p className="modal-desc">
                Enter your authorized clinical passcode to unlock case archives and run inference pipelines.
              </p>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="Enter passcode..."
                  value={tempPass}
                  onChange={(e) => setTempPass(e.target.value)}
                  className="modern-input"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowPassModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <CheckCircle2 size={16} />
                  <span>Save & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
