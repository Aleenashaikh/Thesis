import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  Database,
  CheckCheck,
  ArrowUpDown,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import RecordDetailView from "./RecordDetailView";
import CustomSelect from "./CustomSelect";

export default function RecordsScreen({
  records = [],
  loading = false,
  onRefresh,
  activeRecordId,
  setActiveRecordId,
  onReviewSaved,
  apiCall,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [modalityFilter, setModalityFilter] = useState("ALL"); // ALL | XRAY | CT
  const [verdictFilter, setVerdictFilter] = useState("ALL"); // ALL | pending-analysis | pending-review | correct | partly | incorrect
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest

  // Find active record if activeRecordId is specified
  const activeRecord = useMemo(() => {
    if (!activeRecordId) return null;
    return records.find((r) => r._id === activeRecordId) || null;
  }, [records, activeRecordId]);

  // High-level statistics calculation
  const stats = useMemo(() => {
    const total = records.length;
    const pendingAnalysis = records.filter((r) => r.status === "pending" || !r.result).length;
    const stonesDetected = records.filter((r) => r.result?.cls_flag).length;
    const reviewed = records.filter((r) => r.review?.verdict).length;
    const pendingReview = records.filter((r) => r.result && !r.review?.verdict).length;
    return {
      total,
      pendingAnalysis,
      stonesDetected,
      reviewed,
      pendingReview,
    };
  }, [records]);

  // Options configurations for CustomSelect
  const modalityOptions = [
    { value: "ALL", label: "All Modalities", icon: "🌐" },
    { value: "XRAY", label: "X-Ray (KUB)", icon: "🩻" },
    { value: "CT", label: "CT Slice", icon: "🩺" },
  ];

  const verdictOptions = [
    { value: "ALL", label: "All Statuses", badgeColor: "#94a3b8" },
    { value: "pending-analysis", label: "Pending Analysis (Model Offline)", badgeColor: "#6366f1" },
    { value: "pending-review", label: "Pending Specialist Review", badgeColor: "#f59e0b" },
    { value: "correct", label: "Correct", badgeColor: "#10b981" },
    { value: "partly", label: "Partly Correct", badgeColor: "#f59e0b" },
    { value: "incorrect", label: "Incorrect", badgeColor: "#ef4444" },
  ];

  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
  ];

  // Filtered & Sorted list
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        // Modality filter
        if (modalityFilter !== "ALL" && r.modality !== modalityFilter) {
          return false;
        }

        // Status / Verdict filter
        if (verdictFilter === "pending-analysis") {
          if (r.status !== "pending" && r.result) return false;
        } else if (verdictFilter === "pending-review") {
          if (!r.result || r.review?.verdict) return false;
        } else if (verdictFilter !== "ALL") {
          if (r.review?.verdict !== verdictFilter) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const idMatch = r._id?.toLowerCase().includes(q);
          const notesMatch = r.review?.notes?.toLowerCase().includes(q);
          const modalityMatch = r.modality?.toLowerCase().includes(q);
          if (!idMatch && !notesMatch && !modalityMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortBy === "newest" ? timeB - timeA : timeA - timeB;
      });
  }, [records, modalityFilter, verdictFilter, searchQuery, sortBy]);

  // If a specific record is currently opened, display RecordDetailView!
  if (activeRecord) {
    return (
      <RecordDetailView
        record={activeRecord}
        allRecords={records}
        onBack={() => setActiveRecordId(null)}
        onSelectRecord={(rec) => setActiveRecordId(rec._id)}
        onReviewSaved={onReviewSaved}
        apiCall={apiCall}
      />
    );
  }

  return (
    <div className="screen-container">
      {/* Hero Header */}
      <div className="section-hero">
        <div className="section-badge">
          <Database size={14} />
          <span>Screen 2: Clinical Records Archive</span>
        </div>
        <div className="hero-header-row">
          <div>
            <h1 className="section-title">Case Records & Review Database</h1>
            <p className="section-subtitle">
              Browse historical diagnostic scans, inspect dual original & detected radiographs, and submit urologist evaluations.
            </p>
          </div>
          <button
            className={`btn-refresh-records ${loading ? "is-refreshing" : ""}`}
            onClick={onRefresh}
            disabled={loading}
            title="Refresh database"
          >
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh Records"}</span>
          </button>
        </div>
      </div>

      {/* Statistics Ribbon */}
      <div className="stats-ribbon-grid">
        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-blue">
            <FolderOpen size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Ingested Scans</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-indigo">
            <Clock size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.pendingAnalysis}</span>
            <span className="stat-label">Pending Model Analysis</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-amber">
            <Sparkles size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.pendingReview}</span>
            <span className="stat-label">Pending Specialist Review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrap stat-icon-green">
            <CheckCheck size={20} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{stats.reviewed}</span>
            <span className="stat-label">Reviews Finalized</span>
          </div>
        </div>
      </div>

      {/* Modern Filter Toolbar */}
      <div className="records-control-bar">
        {/* Search Input Box */}
        <div className="search-input-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by Case ID, notes, or modality..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              ×
            </button>
          )}
        </div>

        {/* Custom Aesthetic Dropdown Filters */}
        <div className="filter-controls-group">
          {/* Modality Custom Dropdown */}
          <CustomSelect
            label="Modality:"
            icon={Layers}
            value={modalityFilter}
            onChange={setModalityFilter}
            options={modalityOptions}
          />

          {/* Status Custom Dropdown */}
          <CustomSelect
            label="Status:"
            icon={SlidersHorizontal}
            value={verdictFilter}
            onChange={setVerdictFilter}
            options={verdictOptions}
          />

          {/* Sort Custom Dropdown */}
          <CustomSelect
            label="Sort By:"
            icon={ArrowUpDown}
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
          />
        </div>
      </div>

      {/* Quick Modality Filter Chips (One-Click Selection) */}
      <div className="quick-filter-chips-row">
        <span className="quick-filter-caption">Quick Modality:</span>
        <div className="quick-chips-group">
          <button
            className={`quick-chip-btn ${modalityFilter === "ALL" ? "is-active" : ""}`}
            onClick={() => setModalityFilter("ALL")}
          >
            All Modalities ({records.length})
          </button>
          <button
            className={`quick-chip-btn ${modalityFilter === "XRAY" ? "is-active" : ""}`}
            onClick={() => setModalityFilter("XRAY")}
          >
            🩻 X-Ray ({records.filter((r) => r.modality === "XRAY").length})
          </button>
          <button
            className={`quick-chip-btn ${modalityFilter === "CT" ? "is-active" : ""}`}
            onClick={() => setModalityFilter("CT")}
          >
            🩺 CT Slice ({records.filter((r) => r.modality === "CT").length})
          </button>
          {stats.pendingAnalysis > 0 && (
            <button
              className={`quick-chip-btn chip-pending ${verdictFilter === "pending-analysis" ? "is-active" : ""}`}
              onClick={() => setVerdictFilter(verdictFilter === "pending-analysis" ? "ALL" : "pending-analysis")}
            >
              ⏳ Pending Detection ({stats.pendingAnalysis})
            </button>
          )}
        </div>
      </div>

      {/* Records Count Indicator */}
      <div className="records-count-strip">
        <span>
          Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> records
        </span>
        {(searchQuery || modalityFilter !== "ALL" || verdictFilter !== "ALL") && (
          <button
            className="btn-reset-filters"
            onClick={() => {
              setSearchQuery("");
              setModalityFilter("ALL");
              setVerdictFilter("ALL");
            }}
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Grid of Case Records */}
      {filteredRecords.length > 0 ? (
        <div className="records-cards-grid">
          {filteredRecords.map((item) => {
            const isPendingAnalysis = item.status === "pending" || !item.result;
            const hasStone = item.result?.cls_flag;
            const boxesCount = item.result?.boxes?.length || 0;
            const verdict = item.review?.verdict;

            return (
              <div
                key={item._id}
                className={`case-record-card ${isPendingAnalysis ? "is-pending-card" : ""}`}
                onClick={() => setActiveRecordId(item._id)}
              >
                {/* Thumbnail Preview with Overlay */}
                <div className="card-thumb-container">
                  <img
                    src={item.imageUrl}
                    alt="Case thumbnail"
                    className="card-thumb-img"
                    loading="lazy"
                  />
                  <span className={`thumb-modality-pill ${item.modality === "XRAY" ? "badge-xray" : "badge-ct"}`}>
                    {item.modality}
                  </span>
                  {boxesCount > 0 && (
                    <span className="thumb-boxes-pill">
                      {boxesCount} {boxesCount === 1 ? "box" : "boxes"}
                    </span>
                  )}
                  {isPendingAnalysis && (
                    <span className="thumb-pending-tag">
                      <Clock size={11} />
                      <span>Pending Analysis</span>
                    </span>
                  )}
                </div>

                {/* Card Info */}
                <div className="card-details">
                  <div className="card-meta-row">
                    <span className="card-case-id">#{item._id.slice(-8)}</span>
                    <span className="card-date">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Status / Classification Row */}
                  <div className="card-status-row">
                    {isPendingAnalysis ? (
                      <span className="verdict-pill pill-pending-analysis">
                        <Clock size={13} />
                        <span>Awaiting Detection</span>
                      </span>
                    ) : (
                      <span
                        className={`verdict-pill ${
                          hasStone ? "pill-stone-detected" : "pill-no-stone"
                        }`}
                      >
                        {hasStone ? (
                          <>
                            <AlertCircle size={13} />
                            <span>Stone ({((item.result?.p_stone || 0) * 100).toFixed(0)}%)</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            <span>No Stone</span>
                          </>
                        )}
                      </span>
                    )}

                    {/* Specialist Review Status Badge */}
                    <span
                      className={`review-badge-pill ${
                        isPendingAnalysis
                          ? "review-not-analyzed"
                          : verdict === "correct"
                          ? "review-correct"
                          : verdict === "partly"
                          ? "review-partly"
                          : verdict === "incorrect"
                          ? "review-incorrect"
                          : "review-pending"
                      }`}
                    >
                      {isPendingAnalysis
                        ? "Not Analyzed"
                        : verdict === "correct"
                        ? "Correct"
                        : verdict === "partly"
                        ? "Partly"
                        : verdict === "incorrect"
                        ? "Incorrect"
                        : "Pending Review"}
                    </span>
                  </div>

                  {/* Notes snippet if exists */}
                  {item.review?.notes && (
                    <p className="card-notes-preview">
                      "{item.review.notes}"
                    </p>
                  )}

                  {/* Card Action */}
                  <div className="card-footer-action">
                    <span className="action-prompt">
                      {isPendingAnalysis ? "Detect & Review" : "Open & Review"}
                    </span>
                    <ChevronRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-records-box">
          <div className="empty-icon-circle">
            <FolderOpen size={36} />
          </div>
          <h3>No Records Found</h3>
          <p>
            {records.length === 0
              ? "No scan records exist yet in the database. Head to Screen 1 to upload and detect your first radiograph!"
              : "No cases match your active filters or search terms. Try resetting your search filters."}
          </p>
          {(searchQuery || modalityFilter !== "ALL" || verdictFilter !== "ALL") && (
            <button
              className="btn-primary"
              onClick={() => {
                setSearchQuery("");
                setModalityFilter("ALL");
                setVerdictFilter("ALL");
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
