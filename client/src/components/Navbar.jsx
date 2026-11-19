import { useState } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  BarChart3,
  ShieldAlert,
  Activity,
  LogOut,
  X,
  Clock,
} from "lucide-react";

export default function Navbar({
  currentScreen,
  setCurrentScreen,
  recordsCount = 0,
  pendingCount = 0,
  onLogout,
}) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

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
              {pendingCount > 0 && (
                <span className="tab-pending-badge" title={`${pendingCount} scan(s) pending model detection`}>
                  <Clock size={11} />
                  <span>{pendingCount}</span>
                </span>
              )}
            </button>

            <button
              className={`nav-tab-btn ${currentScreen === "stats" ? "active" : ""}`}
              onClick={() => setCurrentScreen("stats")}
            >
              <BarChart3 size={18} />
              <span>Statistics</span>
            </button>
          </nav>

          {/* Right Tools: Clinical Disclaimer & Logout */}
          <div className="header-actions">
            <button
              className="disclaimer-trigger-btn"
              onClick={() => setShowDisclaimer(!showDisclaimer)}
              title="Toggle Research Disclaimer"
            >
              <ShieldAlert size={15} />
              <span className="hide-on-mobile">Clinical Protocol</span>
            </button>

            {onLogout && (
              <button
                className="logout-pill-btn"
                onClick={onLogout}
                title="Log out of clinical session"
              >
                <LogOut size={15} />
                <span className="hide-on-mobile">Log Out</span>
              </button>
            )}
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
    </>
  );
}
