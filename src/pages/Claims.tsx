import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Stethoscope,
  UploadCloud,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  addClaimNote,
  fetchReviewQueue,
  resetClaimsQueue,
  runAllFrontendApiTests,
  submitHumanReview,
  uploadClaims,
  type EndpointTestResult,
} from '../api/hacClient';
import { PageHeader, RiskBadge, StatusBadge } from '../components/UI';
import type {
  HacSignalLevel,
  HumanReviewDecisionOutcome,
  ReviewQueueFilterDTO,
  ReviewQueueItemDTO,
  ReviewStatus,
} from '../../server/contracts/hac.types';

export default function Claims() {
  const nav = useNavigate();

  // Filter & Queue State
  const [activeTab, setActiveTab] = useState<'all' | 'high' | 'in_review' | 'confirmed'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ReviewQueueItemDTO[]>([]);
  const [counts, setCounts] = useState({ total: 0, highPriority: 0, inReview: 0, confirmed: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dropdown & Filter Controls
  const [dateRange, setDateRange] = useState<'ALL' | '7D' | '30D' | '90D'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'REVIEW' | 'MONITOR'>('ALL');
  const [providerFilter, setProviderFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [riskDropdownOpen, setRiskDropdownOpen] = useState(false);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  // Modals State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<'presets' | 'json' | 'manual'>('presets');
  const [uploading, setUploading] = useState(false);
  const [rawJsonText, setRawJsonText] = useState('');

  // Manual Entry Form State
  const [manualClaimId, setManualClaimId] = useState('');
  const [manualPatientId, setManualPatientId] = useState('');
  const [manualPrimaryDiag, setManualPrimaryDiag] = useState('K35.80');
  const [manualHacDiag, setManualHacDiag] = useState('T81.41XA');
  const [manualElapsedHours, setManualElapsedHours] = useState('72');

  // Diagnostics Suite State
  const [diagnosticsModalOpen, setDiagnosticsModalOpen] = useState(false);
  const [testResults, setTestResults] = useState<EndpointTestResult[]>([]);
  const [runningTests, setRunningTests] = useState(false);

  // Quick Action Modals
  const [quickNoteClaim, setQuickNoteClaim] = useState<ReviewQueueItemDTO | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [quickReviewClaim, setQuickReviewClaim] = useState<ReviewQueueItemDTO | null>(null);
  const [reviewOutcome, setReviewOutcome] = useState<HumanReviewDecisionOutcome>('CONFIRM_CONCERN');
  const [reviewRationale, setReviewRationale] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedClaimId, setCopiedClaimId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // Close menus on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setDateDropdownOpen(false);
      setRiskDropdownOpen(false);
      setActiveRowMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Fetch Review Queue Data
  const loadQueue = () => {
    setLoading(true);

    const filterObj: ReviewQueueFilterDTO = {
      page,
      pageSize: 8,
      search: search.trim() || undefined,
    };

    if (activeTab === 'high') filterObj.signalLevel = 'HIGH';
    if (activeTab === 'in_review') filterObj.reviewStatus = 'IN_REVIEW';
    if (activeTab === 'confirmed') filterObj.reviewStatus = 'CONFIRMED';

    // Risk level filter override
    if (riskFilter !== 'ALL') {
      filterObj.signalLevel = riskFilter as HacSignalLevel;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      filterObj.reviewStatus = statusFilter as ReviewStatus;
    }

    // Provider filter
    if (providerFilter !== 'ALL') {
      filterObj.providerId = providerFilter;
    }

    // Date range filter
    if (dateRange !== 'ALL') {
      const now = Date.now();
      const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : 90;
      filterObj.startDate = new Date(now - days * 24 * 3600 * 1000).toISOString();
    }

    fetchReviewQueue(filterObj)
      .then((res) => {
        setItems(res.items);
        setCounts(res.summaryCounts);
        setTotalPages(res.pagination.totalPages);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load review queue:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
  }, [activeTab, search, page, riskFilter, dateRange, statusFilter, providerFilter]);

  // Run diagnostics suite
  const handleRunDiagnostics = async () => {
    setRunningTests(true);
    try {
      const results = await runAllFrontendApiTests();
      setTestResults(results);
    } catch (e: any) {
      console.error('Diagnostics suite error:', e);
    } finally {
      setRunningTests(false);
    }
  };

  // Open diagnostics and immediately run tests
  const openDiagnostics = () => {
    setDiagnosticsModalOpen(true);
    handleRunDiagnostics();
  };

  // Quick Preset Claim Ingestion
  const handleIngestPreset = async (presetType: 'uti' | 'sepsis' | 'fall') => {
    try {
      setUploading(true);
      const res = await uploadClaims({ preset: presetType });
      setUploadModalOpen(false);
      showToast(`Ingested ${res.claims[0].claimId} · Score: ${res.investigationSummary?.score ?? 'Evaluated'} (${res.investigationSummary?.level ?? 'HIGH'})`);
      loadQueue();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Custom JSON Upload
  const handleUploadJson = async () => {
    if (!rawJsonText.trim()) return;
    try {
      setUploading(true);
      const parsed = JSON.parse(rawJsonText);
      const payload = Array.isArray(parsed) ? parsed : [parsed];
      const res = await uploadClaims(payload);
      setUploadModalOpen(false);
      setRawJsonText('');
      showToast(`Successfully uploaded and scored ${res.count} claims!`);
      loadQueue();
    } catch (err: any) {
      alert(`Invalid JSON or ingestion error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Manual Form Upload
  const handleManualUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      const now = new Date();
      const admIso = new Date(now.getTime() - 5 * 24 * 3600 * 1000).toISOString();
      const elapsedHoursNum = parseFloat(manualElapsedHours) || 72;
      const hacObservedIso = new Date(new Date(admIso).getTime() + elapsedHoursNum * 3600 * 1000).toISOString();

      const newClaim = {
        claimId: manualClaimId.trim() || undefined,
        patientId: manualPatientId.trim() || undefined,
        admissionDateTime: admIso,
        dischargeDateTime: now.toISOString(),
        primaryDiagnosis: {
          code: manualPrimaryDiag.trim(),
          description: 'Primary admission diagnosis',
          isPrimaryAdmissionDiagnosis: true,
          isSuspectedHacCondition: false,
          firstObservedDateTime: admIso,
        },
        diagnoses: [
          {
            code: manualPrimaryDiag.trim(),
            description: 'Primary admission diagnosis',
            isPrimaryAdmissionDiagnosis: true,
            isSuspectedHacCondition: false,
            firstObservedDateTime: admIso,
          },
          {
            code: manualHacDiag.trim(),
            description: 'Secondary complication observed during stay',
            isPrimaryAdmissionDiagnosis: false,
            isSuspectedHacCondition: true,
            firstObservedDateTime: hacObservedIso,
          },
        ],
        procedures: [
          {
            code: '02.12',
            description: 'Exploratory procedure / Clinical intervention',
            performedDateTime: hacObservedIso,
            isPlannedOnAdmission: false,
            isReturnToTheatre: elapsedHoursNum > 48,
          },
        ],
      };

      const res = await uploadClaims([newClaim]);
      setUploadModalOpen(false);
      setManualClaimId('');
      setManualPatientId('');
      showToast(`Claim ${res.claims[0].claimId} successfully uploaded & evaluated!`);
      loadQueue();
    } catch (err: any) {
      alert(`Manual upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Quick Note Submission
  const handleQuickAddNote = async () => {
    if (!quickNoteClaim || !noteContent.trim()) return;
    try {
      setSubmittingNote(true);
      await addClaimNote(quickNoteClaim.claimId, noteContent.trim());
      showToast(`Clinical note added to ${quickNoteClaim.claimId}`);
      setQuickNoteClaim(null);
      setNoteContent('');
      loadQueue();
    } catch (err: any) {
      alert(`Error submitting note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  // Quick Review Submission
  const handleQuickReviewSubmit = async () => {
    if (!quickReviewClaim) return;
    try {
      setSubmittingReview(true);
      await submitHumanReview(
        quickReviewClaim.claimId,
        reviewOutcome,
        reviewRationale.trim() || 'Reviewed from claims worklist.'
      );
      showToast(`Review decision recorded for ${quickReviewClaim.claimId}`);
      setQuickReviewClaim(null);
      setReviewRationale('');
      loadQueue();
    } catch (err: any) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Copy Claim ID to Clipboard
  const handleCopyClaimId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedClaimId(id);
    showToast(`Copied ${id} to clipboard`);
    setTimeout(() => setCopiedClaimId(null), 2000);
    setActiveRowMenu(null);
  };

  // Format Helper
  const mapRisk = (level: string) => {
    if (level === 'HIGH') return 'High';
    if (level === 'REVIEW') return 'Medium';
    return 'Low';
  };

  const mapStatus = (status: ReviewStatus) => {
    if (status === 'IN_REVIEW') return 'In Review';
    if (status === 'CONFIRMED') return 'Confirmed';
    if (status === 'RESOLVED') return 'Cleared';
    if (status === 'MONITORING') return 'Monitoring';
    return 'New';
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return isNaN(d.getTime())
      ? isoStr
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Active filters count
  const activeFiltersCount =
    (riskFilter !== 'ALL' ? 1 : 0) +
    (dateRange !== 'ALL' ? 1 : 0) +
    (providerFilter !== 'ALL' ? 1 : 0) +
    (statusFilter !== 'ALL' ? 1 : 0);

  return (
    <>
      <PageHeader
        title="Claims"
        subtitle="View and analyze claims with backend-driven HAC signals"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live API Health & Diagnostics Button */}
            <button
              id="test-endpoints-btn"
              className="btn outline live-test-btn"
              onClick={openDiagnostics}
              title="Test all 9 backend endpoints directly from frontend"
            >
              <span className="pulse-dot" />
              <Activity size={16} />
              Test All Endpoints
            </button>

            {/* Primary Action: Upload Claims Button */}
            <button
              id="upload-claims-btn"
              className="btn primary"
              onClick={() => setUploadModalOpen(true)}
            >
              <Plus size={16} /> Upload Claims
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => { setActiveTab('all'); setPage(1); }}
        >
          All Claims ({counts.total})
        </button>
        <button
          className={`tab ${activeTab === 'high' ? 'active' : ''}`}
          onClick={() => { setActiveTab('high'); setPage(1); }}
        >
          HAC Signals ({counts.highPriority})
        </button>
        <button
          className={`tab ${activeTab === 'in_review' ? 'active' : ''}`}
          onClick={() => { setActiveTab('in_review'); setPage(1); }}
        >
          In Review ({counts.inReview})
        </button>
        <button
          className={`tab ${activeTab === 'confirmed' ? 'active' : ''}`}
          onClick={() => { setActiveTab('confirmed'); setPage(1); }}
        >
          Confirmed ({counts.confirmed})
        </button>
      </div>

      {/* Toolbar with fully functional interactive buttons */}
      <div className="toolbar">
        <div className="search">
          <Search size={17} />
          <input
            placeholder="Search by patient ID, claim number, diagnosis code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              style={{ border: 0, background: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Date Range Dropdown Button */}
        <div className="dropdown-container" onClick={(e) => e.stopPropagation()}>
          <button
            id="date-range-btn"
            className={`btn outline ${dateRange !== 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setDateDropdownOpen(!dateDropdownOpen);
              setRiskDropdownOpen(false);
            }}
          >
            <CalendarDays size={16} />
            {dateRange === 'ALL' ? 'Date Range' : `Date: ${dateRange}`}
            <ChevronDown size={14} />
          </button>
          {dateDropdownOpen && (
            <div className="custom-dropdown-menu">
              <button
                className={`dropdown-item ${dateRange === 'ALL' ? 'active' : ''}`}
                onClick={() => { setDateRange('ALL'); setDateDropdownOpen(false); setPage(1); }}
              >
                <span>All Episodes (All Time)</span>
                {dateRange === 'ALL' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${dateRange === '7D' ? 'active' : ''}`}
                onClick={() => { setDateRange('7D'); setDateDropdownOpen(false); setPage(1); }}
              >
                <span>Last 7 Days</span>
                {dateRange === '7D' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${dateRange === '30D' ? 'active' : ''}`}
                onClick={() => { setDateRange('30D'); setDateDropdownOpen(false); setPage(1); }}
              >
                <span>Last 30 Days</span>
                {dateRange === '30D' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${dateRange === '90D' ? 'active' : ''}`}
                onClick={() => { setDateRange('90D'); setDateDropdownOpen(false); setPage(1); }}
              >
                <span>Last 90 Days</span>
                {dateRange === '90D' && <Check size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Risk Level Dropdown Button */}
        <div className="dropdown-container" onClick={(e) => e.stopPropagation()}>
          <button
            id="risk-level-btn"
            className={`btn outline ${riskFilter !== 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setRiskDropdownOpen(!riskDropdownOpen);
              setDateDropdownOpen(false);
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background:
                  riskFilter === 'HIGH'
                    ? '#ef4444'
                    : riskFilter === 'REVIEW'
                    ? '#f59e0b'
                    : riskFilter === 'MONITOR'
                    ? '#10b981'
                    : '#94a3b8',
                display: 'inline-block',
                marginRight: 2,
              }}
            />
            {riskFilter === 'ALL'
              ? 'Risk Level'
              : riskFilter === 'HIGH'
              ? 'High Priority'
              : riskFilter === 'REVIEW'
              ? 'Medium (Review)'
              : 'Low / Monitor'}
            <ChevronDown size={14} />
          </button>
          {riskDropdownOpen && (
            <div className="custom-dropdown-menu">
              <button
                className={`dropdown-item ${riskFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => { setRiskFilter('ALL'); setRiskDropdownOpen(false); setPage(1); }}
              >
                <span>All Risk Levels</span>
                {riskFilter === 'ALL' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${riskFilter === 'HIGH' ? 'active' : ''}`}
                onClick={() => { setRiskFilter('HIGH'); setRiskDropdownOpen(false); setPage(1); }}
              >
                <span style={{ color: '#dc2626' }}>● High Risk (HAC Flagged)</span>
                {riskFilter === 'HIGH' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${riskFilter === 'REVIEW' ? 'active' : ''}`}
                onClick={() => { setRiskFilter('REVIEW'); setRiskDropdownOpen(false); setPage(1); }}
              >
                <span style={{ color: '#d97706' }}>● Medium (Review Required)</span>
                {riskFilter === 'REVIEW' && <Check size={14} />}
              </button>
              <button
                className={`dropdown-item ${riskFilter === 'MONITOR' ? 'active' : ''}`}
                onClick={() => { setRiskFilter('MONITOR'); setRiskDropdownOpen(false); setPage(1); }}
              >
                <span style={{ color: '#16a34a' }}>● Low (Monitor Only)</span>
                {riskFilter === 'MONITOR' && <Check size={14} />}
              </button>
            </div>
          )}
        </div>

        {/* Filters Drawer / Modal Button */}
        <button
          id="filters-btn"
          className={`btn outline ${activeFiltersCount > 0 ? 'active' : ''}`}
          onClick={() => setFiltersDrawerOpen(true)}
        >
          <Filter size={16} />
          Filters
          {activeFiltersCount > 0 && (
            <span
              style={{
                background: '#0f3c6e',
                color: '#fff',
                fontSize: 10,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
              }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && (
          <button
            className="btn ghost"
            style={{ fontSize: 11, color: '#64748b' }}
            onClick={() => {
              setRiskFilter('ALL');
              setDateRange('ALL');
              setProviderFilter('ALL');
              setStatusFilter('ALL');
              setSearch('');
              setPage(1);
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Claims Table */}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Claim #</th>
              <th>Patient</th>
              <th>Admission Date</th>
              <th>Diagnosis Code</th>
              <th>HAC Score</th>
              <th>Risk Level</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  <RefreshCw className="spin" size={20} style={{ margin: '0 auto 8px', display: 'block' }} />
                  Loading claims from HAC backend service...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <AlertTriangle size={24} style={{ color: '#f59e0b', margin: '0 auto 8px', display: 'block' }} />
                  <strong>No claims found matching current filters.</strong>
                  <p style={{ fontSize: 12, margin: '6px 0 12px' }}>
                    Try broadening your filters or click Upload Claims to ingest new cases.
                  </p>
                  <button
                    className="btn primary"
                    style={{ margin: '0 auto' }}
                    onClick={() => handleIngestPreset('uti')}
                  >
                    <Plus size={15} /> Ingest Sample Claim
                  </button>
                </td>
              </tr>
            ) : (
              items.map((c) => (
                <tr
                  key={c.claimId}
                  onClick={() => nav(`/claims/${c.claimId}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="link-cell">
                    <strong>{c.claimId}</strong>
                  </td>
                  <td>
                    <div>
                      <span>{c.patientId}</span>
                      {c.providerDisplayName && (
                        <small style={{ display: 'block', color: '#64748b', fontSize: 10 }}>
                          {c.providerDisplayName}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>{formatDate(c.admissionDateTime)}</td>
                  <td>
                    <code>{c.hacDiagnosisCode || c.primaryDiagnosisCode}</code>
                  </td>
                  <td>
                    <span
                      className={`score-pill ${
                        c.score >= 65 ? 'score-high' : c.score >= 50 ? 'score-med' : 'score-low'
                      }`}
                    >
                      {c.score}
                    </span>
                  </td>
                  <td>
                    <RiskBadge risk={mapRisk(c.signalLevel)} />
                  </td>
                  <td>
                    <StatusBadge status={mapStatus(c.reviewStatus)} />
                  </td>
                  <td>
                    {/* Row Action Button */}
                    <div className="dropdown-container" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn"
                        title="Actions"
                        onClick={() =>
                          setActiveRowMenu(activeRowMenu === c.claimId ? null : c.claimId)
                        }
                      >
                        <MoreHorizontal size={17} />
                      </button>

                      {activeRowMenu === c.claimId && (
                        <div className="custom-dropdown-menu right-aligned">
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setActiveRowMenu(null);
                              nav(`/claims/${c.claimId}`);
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Stethoscope size={14} /> Open Full Investigation
                            </span>
                          </button>
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setActiveRowMenu(null);
                              setQuickNoteClaim(c);
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FileText size={14} /> Add Clinical Audit Note
                            </span>
                          </button>
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setActiveRowMenu(null);
                              setQuickReviewClaim(c);
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CheckCircle2 size={14} /> Quick Review Decision
                            </span>
                          </button>
                          <div className="dropdown-divider" />
                          <button
                            className="dropdown-item"
                            onClick={(e) => handleCopyClaimId(c.claimId, e)}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Copy size={14} />
                              {copiedClaimId === c.claimId ? 'Copied!' : 'Copy Claim ID'}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Table Pagination */}
        <div className="table-footer">
          <span>
            Showing {items.length} of {counts.total} claims (Backend paginated)
          </span>
          <div className="pager">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              title="Previous Page"
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
              <button
                key={pNum}
                className={pNum === page ? 'active' : ''}
                onClick={() => setPage(pNum)}
              >
                {pNum}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Next Page"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 1. UPLOAD CLAIMS MODAL                                              */}
      {/* =================================================================== */}
      {uploadModalOpen && (
        <div className="v3-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="v3-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>CLINICAL INGESTION ENGINE</span>
                <h2>Upload & Ingest Claims</h2>
                <p>
                  Submit inpatient claim episodes. The HAC engine calculates Component A–E scores,
                  temporal POA timing, and assigns signal priority automatically.
                </p>
              </div>
              <button onClick={() => setUploadModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="tabs" style={{ marginBottom: 16 }}>
              <button
                className={`tab ${uploadTab === 'presets' ? 'active' : ''}`}
                onClick={() => setUploadTab('presets')}
              >
                <Sparkles size={14} style={{ display: 'inline', marginRight: 4 }} />
                Clinical Presets (1-Click)
              </button>
              <button
                className={`tab ${uploadTab === 'manual' ? 'active' : ''}`}
                onClick={() => setUploadTab('manual')}
              >
                <Stethoscope size={14} style={{ display: 'inline', marginRight: 4 }} />
                Manual Claim Entry
              </button>
              <button
                className={`tab ${uploadTab === 'json' ? 'active' : ''}`}
                onClick={() => setUploadTab('json')}
              >
                <FileSpreadsheet size={14} style={{ display: 'inline', marginRight: 4 }} />
                JSON Batch Ingestion
              </button>
            </div>

            {uploadTab === 'presets' && (
              <div>
                <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                  Select a clinical scenario to instantly inject into the review queue:
                </p>
                <div className="preset-cards-grid">
                  <div
                    className="preset-card"
                    onClick={() => handleIngestPreset('uti')}
                  >
                    <div className="preset-info">
                      <strong>1. Catheter-Associated Urinary Tract Infection (CAUTI)</strong>
                      <p>
                        Patient admitted with Heart Failure (I50.9); develops UTI (T83.511A) 72 hours
                        after indwelling catheter insertion.
                      </p>
                    </div>
                    <button className="btn primary" disabled={uploading}>
                      {uploading ? 'Ingesting...' : 'Inject Case'}
                    </button>
                  </div>

                  <div
                    className="preset-card"
                    onClick={() => handleIngestPreset('sepsis')}
                  >
                    <div className="preset-info">
                      <strong>2. Post-Cholecystectomy Deep Surgical Site Infection</strong>
                      <p>
                        Patient undergoing laparoscopic cholecystectomy returns to theatre at 90h
                        with abdominal sepsis (T81.42XA).
                      </p>
                    </div>
                    <button className="btn primary" disabled={uploading}>
                      {uploading ? 'Ingesting...' : 'Inject Case'}
                    </button>
                  </div>

                  <div
                    className="preset-card"
                    onClick={() => handleIngestPreset('fall')}
                  >
                    <div className="preset-info">
                      <strong>3. Inpatient Fall Resulting in Femur Fracture</strong>
                      <p>
                        Patient admitted for pneumonia suffers an in-hospital fall 36h into stay,
                        requiring emergent open reduction (S72.001A).
                      </p>
                    </div>
                    <button className="btn primary" disabled={uploading}>
                      {uploading ? 'Ingesting...' : 'Inject Case'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {uploadTab === 'manual' && (
              <form onSubmit={handleManualUpload}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label className="v3-field">
                    <span>Claim ID (optional, auto-generated if blank)</span>
                    <input
                      placeholder="e.g. CLM-2024-020"
                      value={manualClaimId}
                      onChange={(e) => setManualClaimId(e.target.value)}
                    />
                  </label>
                  <label className="v3-field">
                    <span>Patient ID (optional)</span>
                    <input
                      placeholder="e.g. P-88201"
                      value={manualPatientId}
                      onChange={(e) => setManualPatientId(e.target.value)}
                    />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <label className="v3-field">
                    <span>Primary Admission Code</span>
                    <input
                      required
                      placeholder="e.g. K35.80"
                      value={manualPrimaryDiag}
                      onChange={(e) => setManualPrimaryDiag(e.target.value)}
                    />
                  </label>
                  <label className="v3-field">
                    <span>Suspected HAC Code</span>
                    <input
                      required
                      placeholder="e.g. T81.41XA"
                      value={manualHacDiag}
                      onChange={(e) => setManualHacDiag(e.target.value)}
                    />
                  </label>
                  <label className="v3-field">
                    <span>Onset Hours Post-Admission</span>
                    <input
                      required
                      type="number"
                      placeholder="e.g. 72"
                      value={manualElapsedHours}
                      onChange={(e) => setManualElapsedHours(e.target.value)}
                    />
                  </label>
                </div>
                <div className="v3-modal-actions">
                  <button
                    type="button"
                    className="v3-secondary-btn"
                    onClick={() => setUploadModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="v3-primary-btn" disabled={uploading}>
                    {uploading ? 'Processing & Scoring...' : 'Submit Claim'}
                  </button>
                </div>
              </form>
            )}

            {uploadTab === 'json' && (
              <div>
                <p style={{ fontSize: 12, color: '#64748b' }}>
                  Paste a JSON array of claim objects conforming to <code>ClaimEntity</code>:
                </p>
                <textarea
                  rows={9}
                  className="json-textarea"
                  value={rawJsonText}
                  onChange={(e) => setRawJsonText(e.target.value)}
                  placeholder={`[\n  {\n    "claimId": "CLM-CUSTOM-01",\n    "patientId": "P-12345",\n    "admissionDateTime": "2024-02-01T08:00:00Z",\n    "primaryDiagnosis": { "code": "I25.10", "description": "CAD", "isPrimaryAdmissionDiagnosis": true, "isSuspectedHacCondition": false },\n    "diagnoses": [{ "code": "J95.811", "description": "Postprocedural pneumothorax", "isPrimaryAdmissionDiagnosis": false, "isSuspectedHacCondition": true }]\n  }\n]`}
                />
                <div className="v3-modal-actions">
                  <button className="v3-secondary-btn" onClick={() => setUploadModalOpen(false)}>
                    Cancel
                  </button>
                  <button
                    className="v3-primary-btn"
                    disabled={!rawJsonText.trim() || uploading}
                    onClick={handleUploadJson}
                  >
                    {uploading ? 'Ingesting...' : 'Ingest JSON Batch'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 2. ENDPOINT DIAGNOSTICS & SYSTEM TEST SUITE MODAL                   */}
      {/* =================================================================== */}
      {diagnosticsModalOpen && (
        <div className="v3-overlay" onClick={() => setDiagnosticsModalOpen(false)}>
          <div className="v3-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="diag-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="pulse-dot" />
                  <span style={{ fontSize: 10, letterSpacing: '0.1em', fontWeight: 900, color: '#16a34a' }}>
                    LIVE API INTEGRATION VERIFICATION
                  </span>
                </div>
                <h2 style={{ margin: '4px 0 2px', fontSize: 20 }}>Frontend-to-Backend Endpoint Test Suite</h2>
                <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>
                  Executes real HTTP requests directly from this browser window to all Express HAC endpoints.
                </p>
              </div>
              <button
                className="icon-btn"
                onClick={() => setDiagnosticsModalOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="diag-summary-bar">
              <div className="diag-stat-pill">
                <span>Total Tests:</span>
                <strong>{testResults.length} endpoints</strong>
              </div>
              <div className="diag-stat-pill">
                <span>Passing:</span>
                <strong style={{ color: '#16a34a' }}>
                  {testResults.filter((r) => r.ok).length} / {testResults.length}
                </strong>
              </div>
              <div className="diag-stat-pill">
                <span>Avg Latency:</span>
                <strong>
                  {testResults.length > 0
                    ? Math.round(
                        testResults.reduce((acc, r) => acc + r.durationMs, 0) / testResults.length
                      )
                    : 0}{' '}
                  ms
                </strong>
              </div>
              <button
                className="btn primary"
                disabled={runningTests}
                onClick={handleRunDiagnostics}
                style={{ padding: '6px 12px', fontSize: 11 }}
              >
                <RefreshCw size={13} className={runningTests ? 'spin' : ''} />
                {runningTests ? 'Running Live Tests...' : 'Run All Tests Again'}
              </button>
            </div>

            <div className="endpoint-list">
              {runningTests && testResults.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 10px', display: 'block' }} />
                  Testing endpoints across port 5173 / 3001...
                </div>
              ) : (
                testResults.map((t) => (
                  <div key={t.id} className="endpoint-card">
                    <div className="endpoint-card-top">
                      <div className="endpoint-meta">
                        <span className={`method-badge ${t.method}`}>{t.method}</span>
                        <span className="endpoint-path">{t.endpoint}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="endpoint-latency">{t.durationMs}ms</span>
                        <span className={t.ok ? 'status-badge-ok' : 'status-badge-fail'}>
                          {t.ok ? <Check size={12} /> : <AlertTriangle size={12} />}
                          {t.status ? `${t.status} OK` : 'FAILED'}
                        </span>
                      </div>
                    </div>
                    <div className="endpoint-summary-line">
                      <strong>{t.name}:</strong> {t.summary}
                      {t.error && <span style={{ color: '#dc2626', marginLeft: 6 }}>({t.error})</span>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="v3-modal-actions" style={{ marginTop: 16 }}>
              <button
                className="v3-secondary-btn"
                onClick={async () => {
                  if (confirm('Reset review queue to default seed claims?')) {
                    await resetClaimsQueue();
                    showToast('Queue reset to seed claims');
                    loadQueue();
                  }
                }}
              >
                Reset Database to Seed
              </button>
              <button className="v3-primary-btn" onClick={() => setDiagnosticsModalOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 3. ADVANCED FILTERS DRAWER                                          */}
      {/* =================================================================== */}
      {filtersDrawerOpen && (
        <div className="v3-overlay" onClick={() => setFiltersDrawerOpen(false)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>FILTER CLAIMS WORKLIST</span>
                <h2>Queue Filters</h2>
              </div>
              <button onClick={() => setFiltersDrawerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <label className="v3-field">
              <span>Risk Priority Band</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value as any)}
              >
                <option value="ALL">All Risk Levels</option>
                <option value="HIGH">High Priority (Score ≥ 65)</option>
                <option value="REVIEW">Medium / Review Band (Score 50–64)</option>
                <option value="MONITOR">Low / Monitoring (Score &lt; 50)</option>
              </select>
            </label>

            <label className="v3-field">
              <span>Review Workflow Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">New (Unreviewed)</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="CONFIRMED">Confirmed HAC</option>
                <option value="RESOLVED">Cleared / Resolved</option>
                <option value="MONITORING">Monitoring</option>
              </select>
            </label>

            <label className="v3-field">
              <span>Healthcare Provider / Hospital</span>
              <select
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
              >
                <option value="ALL">All Providers</option>
                <option value="PRV-GEN-9901">General Hospital (FAC-GH-01)</option>
                <option value="PRV-STJ-4412">St. Jude Medical Center (FAC-SJ-02)</option>
                <option value="PRV-CTY-2201">City Central Clinic (FAC-CC-03)</option>
              </select>
            </label>

            <div className="v3-modal-actions">
              <button
                className="v3-secondary-btn"
                onClick={() => {
                  setRiskFilter('ALL');
                  setDateRange('ALL');
                  setProviderFilter('ALL');
                  setStatusFilter('ALL');
                  setFiltersDrawerOpen(false);
                  setPage(1);
                }}
              >
                Clear All
              </button>
              <button
                className="v3-primary-btn"
                onClick={() => {
                  setFiltersDrawerOpen(false);
                  setPage(1);
                  loadQueue();
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 4. QUICK ADD NOTE MODAL                                             */}
      {/* =================================================================== */}
      {quickNoteClaim && (
        <div className="v3-overlay" onClick={() => setQuickNoteClaim(null)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>CLINICAL AUDIT WORKFLOW</span>
                <h2>Add Note for {quickNoteClaim.claimId}</h2>
                <p>Attach clinical observation or auditor queries.</p>
              </div>
              <button onClick={() => setQuickNoteClaim(null)}>
                <X size={18} />
              </button>
            </div>

            <label className="v3-field">
              <span>Auditor Note Content</span>
              <textarea
                rows={5}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Document operative notes, clinical review findings, or laboratory confirmation..."
              />
            </label>

            <div className="v3-modal-actions">
              <button className="v3-secondary-btn" onClick={() => setQuickNoteClaim(null)}>
                Cancel
              </button>
              <button
                className="v3-primary-btn"
                disabled={!noteContent.trim() || submittingNote}
                onClick={handleQuickAddNote}
              >
                {submittingNote ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 5. QUICK REVIEW DECISION MODAL                                      */}
      {/* =================================================================== */}
      {quickReviewClaim && (
        <div className="v3-overlay" onClick={() => setQuickReviewClaim(null)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>HUMAN CLINICAL DETERMINATION</span>
                <h2>Review Decision: {quickReviewClaim.claimId}</h2>
                <p>Record clinical rationale. HAC signals never auto-deny claims.</p>
              </div>
              <button onClick={() => setQuickReviewClaim(null)}>
                <X size={18} />
              </button>
            </div>

            <label className="v3-field">
              <span>Review Determination Outcome</span>
              <select
                value={reviewOutcome}
                onChange={(e) => setReviewOutcome(e.target.value as HumanReviewDecisionOutcome)}
              >
                <option value="CONFIRM_CONCERN">Confirm HAC Concern (Confirmed Complication)</option>
                <option value="NO_CONCERN">No Concern (Present on Admission / Cleared)</option>
                <option value="EXPECTED_PROGRESSION">Expected Clinical Progression</option>
                <option value="NEED_MORE_INFORMATION">Need More Clinical Information</option>
                <option value="MONITOR">Monitor Only (Low Risk Observation)</option>
                <option value="ROUTE_OTHER_PROVIDER">Route to Another Provider</option>
              </select>
            </label>

            <label className="v3-field">
              <span>Auditor Clinical Rationale</span>
              <textarea
                rows={4}
                value={reviewRationale}
                onChange={(e) => setReviewRationale(e.target.value)}
                placeholder="Explain the clinical basis for this determination..."
              />
            </label>

            <div className="v3-modal-actions">
              <button className="v3-secondary-btn" onClick={() => setQuickReviewClaim(null)}>
                Cancel
              </button>
              <button
                className="v3-primary-btn"
                disabled={submittingReview}
                onClick={handleQuickReviewSubmit}
              >
                {submittingReview ? 'Recording...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* 6. TOAST FEEDBACK NOTIFICATION                                      */}
      {/* =================================================================== */}
      {toastMessage && (
        <div className="toast-notice">
          <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </>
  );
}
