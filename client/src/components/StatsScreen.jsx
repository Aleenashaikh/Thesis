import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  TrendingUp,
  Target,
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  FileCheck,
  ChevronRight,
  ShieldCheck,
  Activity,
  Award,
  Zap,
} from "lucide-react";

export default function StatsScreen({ apiCall, onGoToRecord }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiCall("/stats");
      setStats(data);
    } catch (err) {
      console.error("Failed to load statistics:", err);
      setError(err.message || "Failed to load statistics from server.");
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalReviews =
    stats?.reviewVerdicts
      ? (stats.reviewVerdicts.correct || 0) +
        (stats.reviewVerdicts.partly || 0) +
        (stats.reviewVerdicts.incorrect || 0)
      : 0;

  const correctPct =
    totalReviews > 0
      ? (((stats?.reviewVerdicts?.correct || 0) / totalReviews) * 100).toFixed(1)
      : 0;
  const partlyPct =
    totalReviews > 0
      ? (((stats?.reviewVerdicts?.partly || 0) / totalReviews) * 100).toFixed(1)
      : 0;
  const incorrectPct =
    totalReviews > 0
      ? (((stats?.reviewVerdicts?.incorrect || 0) / totalReviews) * 100).toFixed(1)
      : 0;

  const totalAnalyzed = (stats?.stonesDetected || 0) + (stats?.noStones || 0);
  const stonesPct =
    totalAnalyzed > 0
      ? (((stats?.stonesDetected || 0) / totalAnalyzed) * 100).toFixed(1)
      : 0;
  const noStonesPct =
    totalAnalyzed > 0
      ? (((stats?.noStones || 0) / totalAnalyzed) * 100).toFixed(1)
      : 0;

  const totalModalities = (stats?.byModality?.CT || 0) + (stats?.byModality?.XRAY || 0);
  const ctPct =
    totalModalities > 0
      ? (((stats?.byModality?.CT || 0) / totalModalities) * 100).toFixed(1)
      : 0;
  const xrayPct =
    totalModalities > 0
      ? (((stats?.byModality?.XRAY || 0) / totalModalities) * 100).toFixed(1)
      : 0;

  return (
    <div className="screen-container stats-screen-container">
      {/* Hero Header */}
      <div className="section-hero">
        <div className="section-badge">
          <BarChart3 size={14} />
          <span>Analytics & Clinical Accuracy</span>
        </div>
        <div className="hero-header-row">
          <div>
            <h1 className="section-title">Model Performance & Audit Statistics</h1>
            <p className="section-subtitle">
              Comprehensive clinical evaluation metrics, specialist review agreement rates, and radiograph processing telemetry.
            </p>
          </div>
          <button
            className={`btn-refresh-records ${loading ? "is-refreshing" : ""}`}
            onClick={fetchStats}
            disabled={loading}
            title="Refresh statistics"
          >
            <RefreshCw size={16} className={loading ? "spin-icon" : ""} />
            <span>{loading ? "Refreshing..." : "Refresh Stats"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button className="btn-secondary" onClick={fetchStats} style={{ marginLeft: "auto" }}>
            Try Again
          </button>
        </div>
      )}

      {loading && !stats ? (
        <div className="stats-loading-box">
          <RefreshCw size={36} className="spin-icon text-primary" />
          <p>Compiling clinical evaluation data & metrics...</p>
        </div>
      ) : stats ? (
        <>
          {/* Row 1: KPI Summary Cards */}
          <div className="stats-summary-grid">
            <div className="stats-kpi-card card-total">
              <div className="stats-kpi-icon-wrap blue">
                <Database size={22} />
              </div>
              <div className="stats-kpi-content">
                <span className="stats-kpi-val">{stats.totalCases ?? 0}</span>
                <span className="stats-kpi-label">Total Ingested Scans</span>
              </div>
            </div>

            <div className="stats-kpi-card card-pending">
              <div className="stats-kpi-icon-wrap amber">
                <Clock size={22} />
              </div>
              <div className="stats-kpi-content">
                <span className="stats-kpi-val">{stats.pending ?? 0}</span>
                <span className="stats-kpi-label">Pending Analysis</span>
                <span className="stats-kpi-sub">Awaiting model inference</span>
              </div>
            </div>

            <div className="stats-kpi-card card-analyzed">
              <div className="stats-kpi-icon-wrap indigo">
                <Zap size={22} />
              </div>
              <div className="stats-kpi-content">
                <span className="stats-kpi-val">{stats.analyzed ?? 0}</span>
                <span className="stats-kpi-label">Analyzed (Pending Review)</span>
                <span className="stats-kpi-sub">Ready for specialist</span>
              </div>
            </div>

            <div className="stats-kpi-card card-reviewed">
              <div className="stats-kpi-icon-wrap green">
                <ShieldCheck size={22} />
              </div>
              <div className="stats-kpi-content">
                <span className="stats-kpi-val">{stats.reviewed ?? 0}</span>
                <span className="stats-kpi-label">Clinical Reviews Saved</span>
                <span className="stats-kpi-sub">Specialist validated</span>
              </div>
            </div>
          </div>

          {/* Row 2: Accuracy & Detection Split */}
          <div className="stats-cards-row">
            {/* Model Accuracy Hero Card */}
            <div className="stats-card-panel accuracy-hero-panel">
              <div className="panel-header-clean">
                <div className="panel-header-title-group">
                  <Award size={18} className="text-primary" />
                  <h3>AI Model Accuracy & Specialist Agreement</h3>
                </div>
                <span className="sample-badge">
                  {totalReviews} {totalReviews === 1 ? "Review" : "Reviews"} Audited
                </span>
              </div>

              {totalReviews > 0 ? (
                <div className="accuracy-metrics-body">
                  <div className="accuracy-big-display">
                    <div className="accuracy-circle-stat">
                      <span className="accuracy-number">
                        {stats.modelAccuracy !== null ? stats.modelAccuracy.toFixed(1) : 0}%
                      </span>
                      <span className="accuracy-caption">Exact Match Accuracy</span>
                    </div>

                    <div className="accuracy-sub-stat">
                      <div className="sub-stat-row">
                        <span className="sub-stat-label">Clinical Agreement (Correct + Partly):</span>
                        <strong className="sub-stat-val text-success">
                          {stats.modelAgreement !== null ? stats.modelAgreement.toFixed(1) : 0}%
                        </strong>
                      </div>
                      <div className="stats-progress-bar">
                        <div
                          className="stats-progress-fill fill-green"
                          style={{ width: `${stats.modelAgreement || 0}%` }}
                        />
                      </div>

                      <div className="sub-stat-row" style={{ marginTop: "14px" }}>
                        <span className="sub-stat-label">Strict Exact Match (Correct only):</span>
                        <strong className="sub-stat-val text-primary">
                          {stats.modelAccuracy !== null ? stats.modelAccuracy.toFixed(1) : 0}%
                        </strong>
                      </div>
                      <div className="stats-progress-bar">
                        <div
                          className="stats-progress-fill fill-blue"
                          style={{ width: `${stats.modelAccuracy || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="accuracy-disclaimer">
                    * Accuracy is calculated based on verified specialist feedback across all reviewed cases.
                  </p>
                </div>
              ) : (
                <div className="stats-empty-sub">
                  <Target size={32} className="text-dim" />
                  <h4>No Specialist Reviews Yet</h4>
                  <p>
                    Review completed cases in the Case Records tab to generate real-time accuracy and agreement metrics.
                  </p>
                </div>
              )}
            </div>

            {/* Detection Distribution Card */}
            <div className="stats-card-panel">
              <div className="panel-header-clean">
                <div className="panel-header-title-group">
                  <Sparkles size={18} className="text-primary" />
                  <h3>Detection Distribution</h3>
                </div>
                <span className="sample-badge">{totalAnalyzed} Analyzed</span>
              </div>

              <div className="distribution-body">
                <div className="dist-item">
                  <div className="dist-header">
                    <div className="dist-label-group">
                      <AlertCircle size={16} className="text-danger" />
                      <span>Calculus Suspected</span>
                    </div>
                    <strong>{stats.stonesDetected ?? 0} ({stonesPct}%)</strong>
                  </div>
                  <div className="stats-progress-bar">
                    <div
                      className="stats-progress-fill fill-red"
                      style={{ width: `${stonesPct}%` }}
                    />
                  </div>
                </div>

                <div className="dist-item">
                  <div className="dist-header">
                    <div className="dist-label-group">
                      <CheckCircle2 size={16} className="text-success" />
                      <span>No Calculus Suspected</span>
                    </div>
                    <strong>{stats.noStones ?? 0} ({noStonesPct}%)</strong>
                  </div>
                  <div className="stats-progress-bar">
                    <div
                      className="stats-progress-fill fill-green"
                      style={{ width: `${noStonesPct}%` }}
                    />
                  </div>
                </div>

                <div className="dist-modality-split">
                  <span className="dist-subhead">Modality Breakdown</span>
                  <div className="modality-pills-row">
                    <div className="modality-stat-pill badge-xray">
                      <span>🩻 X-Ray (KUB):</span>
                      <strong>{stats.byModality?.XRAY ?? 0} ({xrayPct}%)</strong>
                    </div>
                    <div className="modality-stat-pill badge-ct">
                      <span>🩺 CT Slice:</span>
                      <strong>{stats.byModality?.CT ?? 0} ({ctPct}%)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Review Verdicts Breakdown & Recent Cases */}
          <div className="stats-cards-row">
            {/* Review Verdicts Card */}
            <div className="stats-card-panel">
              <div className="panel-header-clean">
                <div className="panel-header-title-group">
                  <FileCheck size={18} className="text-primary" />
                  <h3>Specialist Review Breakdown</h3>
                </div>
                <span className="sample-badge">{totalReviews} Reviews</span>
              </div>

              <div className="verdict-breakdown-body">
                <div className="verdict-stat-row">
                  <div className="verdict-dot dot-correct" />
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Correct Localization</span>
                    <span className="verdict-desc">Verified stone presence & position</span>
                  </div>
                  <div className="verdict-count-wrap">
                    <strong>{stats.reviewVerdicts?.correct ?? 0}</strong>
                    <span className="pct">({correctPct}%)</span>
                  </div>
                </div>
                <div className="stats-progress-bar">
                  <div
                    className="stats-progress-fill fill-green"
                    style={{ width: `${correctPct}%` }}
                  />
                </div>

                <div className="verdict-stat-row" style={{ marginTop: "14px" }}>
                  <div className="verdict-dot dot-partly" />
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Partly Correct</span>
                    <span className="verdict-desc">Minor bounding box / boundary shift</span>
                  </div>
                  <div className="verdict-count-wrap">
                    <strong>{stats.reviewVerdicts?.partly ?? 0}</strong>
                    <span className="pct">({partlyPct}%)</span>
                  </div>
                </div>
                <div className="stats-progress-bar">
                  <div
                    className="stats-progress-fill fill-amber"
                    style={{ width: `${partlyPct}%` }}
                  />
                </div>

                <div className="verdict-stat-row" style={{ marginTop: "14px" }}>
                  <div className="verdict-dot dot-incorrect" />
                  <div className="verdict-label-wrap">
                    <span className="verdict-name">Incorrect</span>
                    <span className="verdict-desc">False positive or missed stone</span>
                  </div>
                  <div className="verdict-count-wrap">
                    <strong>{stats.reviewVerdicts?.incorrect ?? 0}</strong>
                    <span className="pct">({incorrectPct}%)</span>
                  </div>
                </div>
                <div className="stats-progress-bar">
                  <div
                    className="stats-progress-fill fill-red"
                    style={{ width: `${incorrectPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Cases Card */}
            <div className="stats-card-panel">
              <div className="panel-header-clean">
                <div className="panel-header-title-group">
                  <Clock size={18} className="text-primary" />
                  <h3>Recent Ingested Cases</h3>
                </div>
                <span className="sample-badge">Latest 5</span>
              </div>

              <div className="recent-cases-list">
                {stats.recentCases && stats.recentCases.length > 0 ? (
                  stats.recentCases.map((rc) => (
                    <div
                      key={rc._id}
                      className="recent-case-row"
                      onClick={() => onGoToRecord && onGoToRecord(rc._id)}
                      title="Click to view full case"
                    >
                      <div className="rc-left">
                        <span className="rc-id">#{rc._id.slice(-8)}</span>
                        <span className={`rc-modality ${rc.modality === "XRAY" ? "badge-xray" : "badge-ct"}`}>
                          {rc.modality}
                        </span>
                        <span className="rc-date">
                          {new Date(rc.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </span>
                      </div>

                      <div className="rc-right">
                        <span
                          className={`rc-status-pill status-${rc.status || "pending"}`}
                        >
                          {rc.status === "pending"
                            ? "Pending Analysis"
                            : rc.status === "analyzed"
                            ? "Analyzed"
                            : "Reviewed"}
                        </span>

                        {rc.verdict ? (
                          <span className={`rc-verdict-pill verdict-${rc.verdict}`}>
                            {rc.verdict}
                          </span>
                        ) : rc.cls_flag !== null ? (
                          <span className={`rc-det-pill ${rc.cls_flag ? "stone" : "clean"}`}>
                            {rc.cls_flag ? "Stone" : "No Stone"}
                          </span>
                        ) : null}

                        <ChevronRight size={15} className="text-muted" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-recent-text">No cases recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
