import { useEffect, useState, useCallback } from "react";
import Navbar from "./components/Navbar";
import UploadScreen from "./components/UploadScreen";
import RecordsScreen from "./components/RecordsScreen";
import LoginScreen from "./components/LoginScreen";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => sessionStorage.getItem("isAuthenticated") === "true"
  );
  const [currentScreen, setCurrentScreen] = useState("upload"); // "upload" | "records"
  const [activeRecordId, setActiveRecordId] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Centralized API call helper
  const apiCall = useCallback(async (path, options = {}) => {
    const res = await fetch(`/api${path}`, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  }, []);

  // Load records from server
  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingRecords(true);
    setFetchError("");
    try {
      const data = await apiCall("/cases");
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.warn("Could not fetch records:", err.message);
      setFetchError(err.message);
    } finally {
      setLoadingRecords(false);
    }
  }, [apiCall, isAuthenticated]);

  // Initial load when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadRecords();
    }
  }, [isAuthenticated, loadRecords]);

  // Handle successful upload in Screen 1
  function handleAnalyzeSuccess(newRecord) {
    setRecords((prev) => [newRecord, ...prev]);
  }

  // Navigate to a specific record in Screen 2
  function handleGoToRecord(recordId) {
    setActiveRecordId(recordId);
    setCurrentScreen("records");
  }

  // Update record in list after specialist review
  function handleReviewSaved(updatedRecord) {
    setRecords((prev) =>
      prev.map((r) => (r._id === updatedRecord._id ? updatedRecord : r))
    );
  }

  // Handle logout
  function handleLogout() {
    sessionStorage.removeItem("isAuthenticated");
    setIsAuthenticated(false);
  }

  // If not authenticated, show clinical PIN login screen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-layout">
      {/* Top Application Bar */}
      <Navbar
        currentScreen={currentScreen}
        setCurrentScreen={(screen) => {
          setCurrentScreen(screen);
          if (screen === "records") {
            setActiveRecordId(null);
          }
        }}
        recordsCount={records.length}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main className="app-main-viewport">
        {currentScreen === "upload" ? (
          <UploadScreen
            onAnalyzeSuccess={handleAnalyzeSuccess}
            onGoToRecord={handleGoToRecord}
            apiCall={apiCall}
          />
        ) : (
          <RecordsScreen
            records={records}
            loading={loadingRecords}
            onRefresh={loadRecords}
            activeRecordId={activeRecordId}
            setActiveRecordId={setActiveRecordId}
            onReviewSaved={handleReviewSaved}
            apiCall={apiCall}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <span className="footer-copyright">
            LithoScan AI · Kidney Stone Clinical Evaluation Platform
          </span>
          <span className="footer-models">
            Hybrid Architecture: EfficientNetV2-S + YOLO11s-960
          </span>
        </div>
      </footer>
    </div>
  );
}
