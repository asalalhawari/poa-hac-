import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  GitBranch,
  HeartPulse,
  History,
  Info,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  addClaimNote,
  fetchInvestigation,
  submitHumanReview,
} from '../api/hacClient';
import type {
  FindingCardDTO,
  HacInvestigationPayloadDTO,
  HumanReviewDecisionOutcome,
  TimelineEventDTO,
} from '../../server/contracts/hac.types';

type EvidenceKey = 'timing' | 'path' | 'intervention' | 'history' | 'coding';

const ICON_MAP = {
  timing: Clock3,
  path: Network,
  intervention: HeartPulse,
  coding: FileText,
  history: History,
};

export default function ClaimDetails() {
  const { claimId = 'CLM-2024-001' } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HacInvestigationPayloadDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceKey | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<TimelineEventDTO | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [decision, setDecision] = useState('');
  const [reviewRationale, setReviewRationale] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [noteContent, setNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const loadData = () => {
    setLoading(true);
    setError(null);
    fetchInvestigation(claimId)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch investigation:', err);
        setError(err.message || 'Failed to load investigation payload');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [claimId]);

  const handleSaveReview = async () => {
    if (!decision || !data) return;
    try {
      setSubmittingReview(true);
      const outcomeMap: Record<string, HumanReviewDecisionOutcome> = {
        'Confirm HAC concern': 'CONFIRM_CONCERN',
        'Expected clinical progression': 'EXPECTED_PROGRESSION',
        'Need more information': 'NEED_MORE_INFORMATION',
        'Route to another provider': 'ROUTE_OTHER_PROVIDER',
        'Monitor only': 'MONITOR',
        'No concern': 'NO_CONCERN',
      };

      const outcome = outcomeMap[decision] || 'CONFIRM_CONCERN';
      await submitHumanReview(
        data.claimId,
        outcome,
        reviewRationale || 'Reviewed according to clinical evidence.'
      );
      setReviewOpen(false);
      setDecision('');
      setReviewRationale('');
      loadData();
    } catch (err: any) {
      alert(`Error saving review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !data) return;
    try {
      setSubmittingNote(true);
      await addClaimNote(data.claimId, noteContent.trim());
      setNotesOpen(false);
      setNoteContent('');
      loadData();
    } catch (err: any) {
      alert(`Error adding note: ${err.message}`);
    } finally {
      setSubmittingNote(false);
    }
  };

  const currentEvidenceCard = useMemo(() => {
    if (!data || !selectedEvidence) return null;
    return data.findingsCards.find((c) => c.key === selectedEvidence) ?? null;
  }, [data, selectedEvidence]);

  if (loading) {
    return (
      <div className="hac-v3-page" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Loading HAC Signal Investigation...</h2>
        <p style={{ color: '#64748b' }}>Evaluating backend scoring rules and clinical evidence for {claimId}...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="hac-v3-page" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Investigation Not Available</h2>
        <p style={{ color: '#ef4444' }}>{error || 'Claim data could not be retrieved from the backend.'}</p>
        <button className="v3-secondary-btn" onClick={() => nav('/claims')} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Claims
        </button>
      </div>
    );
  }

  const { signalResult, stayTimestamps, provider, findingsCards, technicalBreakdown, timeline, clinicalPath, dataQuality, audit, workflow } = data;

  return (
    <div className="hac-v3-page">
      <div className="hac-v3-topbar">
        <button className="v3-ghost-btn" onClick={() => nav('/claims')}>
          <ArrowLeft size={17} /> Claims
        </button>
        <div className="v3-topbar-right">
          <button className="v3-icon-btn" title="Search" onClick={() => setSearchOpen(true)}>
            <Search size={17} />
          </button>
          <button className="v3-secondary-btn" onClick={() => setNotesOpen(true)}>
            Add note {workflow.notesCount > 0 ? `(${workflow.notesCount})` : ''}
          </button>
          <button className="v3-primary-btn" onClick={() => setReviewOpen(true)}>
            Review case <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <header className="v3-case-header">
        <div>
          <div className="v3-kicker">HAC SIGNAL · BACKEND-DRIVEN INVESTIGATION</div>
          <h1>Potential hospital-acquired complication detected</h1>
          <p>
            {data.claimId} · Patient {data.patientId} · {provider.displayName} ({provider.facilityCode})
          </p>
        </div>
        <div className="v3-case-badges">
          <span className={`v3-pill ${signalResult.level === 'HIGH' ? 'critical' : signalResult.level === 'REVIEW' ? 'warning' : ''}`}>
            <AlertTriangle size={14} /> {signalResult.level} priority ({workflow.reviewStatus})
          </span>
          <span className="v3-pill">
            <ShieldCheck size={14} /> {signalResult.action} (No auto-denial)
          </span>
        </div>
      </header>

      <section className="v3-story-grid">
        <article className="v3-score-hero">
          <div className="v3-score-donut">
            <strong>{signalResult.score}</strong>
            <span>/100</span>
          </div>
          <div className="v3-score-copy">
            <span>Overall signal</span>
            <h2>{signalResult.summaryHeadline}</h2>
            <p>{signalResult.summaryDescription}</p>
            <div className="v3-hero-actions">
              <button onClick={() => setTechnicalOpen(true)}>
                How was this calculated? <ChevronRight size={14} />
              </button>
              {timeline.length > 2 && (
                <button onClick={() => setSelectedJourney(timeline[2])}>
                  Show key event <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </article>

        <article className="v3-summary-panel">
          <div className="v3-summary-item">
            <span>What changed?</span>
            <strong>{technicalBreakdown.componentA.description}</strong>
            <small>
              {technicalBreakdown.componentB.elapsedHoursFromAdmission !== null
                ? `First seen ${technicalBreakdown.componentB.elapsedHoursFromAdmission}h after admission`
                : 'Observation timing inferred'}
            </small>
          </div>
          <div className="v3-summary-item">
            <span>What made it serious?</span>
            <strong>{technicalBreakdown.componentD.categoryLabel}</strong>
            <small>{technicalBreakdown.componentD.triggerProcedureDescription || 'No surgical escalation'}</small>
          </div>
          <div className="v3-summary-item">
            <span>Does it fit the original illness?</span>
            <strong className={technicalBreakdown.componentC.outcome === 'UNRELATED' ? 'v3-danger-text' : ''}>
              {technicalBreakdown.componentC.outcomeLabel}
            </strong>
            <small>{technicalBreakdown.componentC.divergencePoint.substring(0, 45)}...</small>
          </div>
          <div className="v3-summary-item">
            <span>What happens now?</span>
            <strong>Reviewer decides</strong>
            <small>No automatic denial or reduction applied</small>
          </div>
        </article>
      </section>

      <section className="v3-section">
        <div className="v3-section-heading">
          <div>
            <span>WHY THIS CLAIM WAS FLAGGED</span>
            <h2>Evidence story</h2>
            <p>Calculated backend evidence components. Click any card to inspect clinical source data.</p>
          </div>
          <div className="v3-confidence">
            <BrainCircuit size={16} />
            <span>AI deviation confidence</span>
            <strong>{clinicalPath.deviationConfidence}</strong>
          </div>
        </div>

        <div className="v3-evidence-grid">
          {findingsCards.map(({ key, title, headline, level, tone, points, maxPoints }) => {
            const Icon = ICON_MAP[key] || Activity;
            return (
              <button
                key={key}
                className={`v3-evidence-card ${tone}`}
                onClick={() => setSelectedEvidence(key as EvidenceKey)}
              >
                <div className="v3-evidence-card-top">
                  <div className="v3-evidence-icon">
                    <Icon size={19} />
                  </div>
                  <span>{level}</span>
                </div>
                <h3>{title}</h3>
                <p>{headline}</p>
                <div className="v3-evidence-card-footer">
                  <span>View evidence</span>
                  <div>
                    <strong>{points}</strong>
                    <small>/{maxPoints}</small>
                    <ChevronRight size={16} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="v3-section">
        <div className="v3-section-heading">
          <div>
            <span>PATIENT JOURNEY</span>
            <h2>Chronological event timeline</h2>
            <p>Normalized patient trajectory comparing admission, procedures, complication onset, and interventions.</p>
          </div>
          <button className="v3-secondary-btn" onClick={() => nav(`/claims/${claimId}/timeline`)}>
            Open timeline view
          </button>
        </div>

        <div className="v3-journey">
          {timeline.map((item, index) => (
            <button
              key={item.id}
              className={`v3-journey-step ${item.status}`}
              onClick={() => setSelectedJourney(item)}
            >
              <div className="v3-journey-index">{index + 1}</div>
              <div className="v3-journey-line" />
              <span>{item.formattedDateTime}</span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
              <em>
                Open details <ChevronRight size={12} />
              </em>
            </button>
          ))}
        </div>
      </section>

      <section className="v3-two-column">
        <article className="v3-panel v3-path-panel">
          <div className="v3-panel-heading">
            <div>
              <span>CLINICAL PATH</span>
              <h2>Expected vs actual journey</h2>
            </div>
            <button onClick={() => setSelectedEvidence('path')}>
              Explain <ChevronRight size={14} />
            </button>
          </div>
          <div className="v3-path-row expected">
            <span>Expected</span>
            <div>
              {clinicalPath.expected.map((step, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <b>{step}</b>
                  {idx < clinicalPath.expected.length - 1 && <ArrowRight size={14} style={{ margin: '0 4px' }} />}
                </span>
              ))}
            </div>
          </div>
          <div className="v3-path-row actual">
            <span>Actual</span>
            <div>
              {clinicalPath.actual.map((step, idx) => (
                <span key={idx} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <b className={idx >= 2 ? 'v3-node-alert' : ''}>{step}</b>
                  {idx < clinicalPath.actual.length - 1 && <ArrowRight size={14} style={{ margin: '0 4px' }} />}
                </span>
              ))}
            </div>
          </div>
          <div className="v3-ai-strip">
            <Sparkles size={17} />
            <div>
              <span>AI supporting evidence</span>
              <strong>
                Path similarity {clinicalPath.similarityPercent}% · {clinicalPath.deviationConfidence} deviation confidence
              </strong>
            </div>
            <button onClick={() => setSelectedEvidence('path')}>See why</button>
          </div>
        </article>

        <article className="v3-panel">
          <div className="v3-panel-heading">
            <div>
              <span>DATA QUALITY & VALIDATION</span>
              <h2>Reliability assessment</h2>
            </div>
            <span className={`v3-pill ${dataQuality.isReliable ? 'good' : 'warning'}`}>
              <CheckCircle2 size={14} /> {dataQuality.overallStatus}
            </span>
          </div>
          <div className="v3-check-list">
            <button onClick={() => setSelectedEvidence('timing')}>
              <CheckCircle2 />
              <div>
                <strong>Admission timing verified</strong>
                <span>Admission: {stayTimestamps.admissionDateTime}</span>
              </div>
              <ChevronRight />
            </button>
            <button onClick={() => setSelectedEvidence('intervention')}>
              <CheckCircle2 />
              <div>
                <strong>Procedure data verified</strong>
                <span>Modifier ceiling enforced at 25 points maximum</span>
              </div>
              <ChevronRight />
            </button>
            <button onClick={() => setSelectedEvidence('history')}>
              <CheckCircle2 />
              <div>
                <strong>Member longitudinal history</strong>
                <span>{technicalBreakdown.componentE.lookbackDaysSearched}-day lookback window evaluated</span>
              </div>
              <ChevronRight />
            </button>
          </div>
        </article>
      </section>

      <section className="v3-review-banner">
        <div>
          <Stethoscope size={22} />
          <div>
            <span>NEXT STEP</span>
            <h2>Human review is required before any payment decision</h2>
            <p>The score routes the claim for review; it does not deny the claim automatically.</p>
          </div>
        </div>
        <button className="v3-primary-btn" onClick={() => setReviewOpen(true)}>
          Start review <ArrowRight size={16} />
        </button>
      </section>

      {/* EVIDENCE DRAWER */}
      {currentEvidenceCard && (
        <div className="v3-overlay" onClick={() => setSelectedEvidence(null)}>
          <aside className="v3-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>EVIDENCE DETAILS</span>
                <h2>{currentEvidenceCard.title}</h2>
              </div>
              <button onClick={() => setSelectedEvidence(null)}>
                <X />
              </button>
            </div>
            <div className="v3-drawer-score">
              <div>
                <strong>{currentEvidenceCard.points}</strong>
                <span>/{currentEvidenceCard.maxPoints}</span>
              </div>
              <p>{currentEvidenceCard.level}</p>
            </div>
            <div className="v3-detail-block">
              <span>What the backend calculated</span>
              <h3>{currentEvidenceCard.headline}</h3>
              <p>{currentEvidenceCard.summary}</p>
            </div>

            {currentEvidenceCard.key === 'timing' && (
              <div className="v3-detail-list">
                <div>
                  <CheckCircle2 />
                  <span>
                    Admission timestamp: {technicalBreakdown.componentB.admissionDateTime}
                  </span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>
                    Complication observation:{' '}
                    {technicalBreakdown.componentB.firstObservedDateTime || 'Not specified'}
                  </span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>
                    Elapsed stay time:{' '}
                    {technicalBreakdown.componentB.elapsedHoursFromAdmission !== null
                      ? `${technicalBreakdown.componentB.elapsedHoursFromAdmission} hours`
                      : 'Inferred'}
                  </span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>Threshold window: ≥{technicalBreakdown.componentB.thresholdHours} hours for in-stay complication</span>
                </div>
              </div>
            )}

            {currentEvidenceCard.key === 'path' && (
              <div className="v3-detail-list">
                <div>
                  <Sparkles />
                  <span>AI Model Version: {audit.modelVersion}</span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>Divergence: {clinicalPath.divergencePoint}</span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>Similarity Index: {clinicalPath.similarityPercent}%</span>
                </div>
              </div>
            )}

            {currentEvidenceCard.key === 'intervention' && (
              <div className="v3-detail-list">
                <div>
                  <CheckCircle2 />
                  <span>Category: {technicalBreakdown.componentD.categoryLabel}</span>
                </div>
                <div>
                  <CheckCircle2 />
                  <span>
                    Trigger: {technicalBreakdown.componentD.triggerProcedureCode} -{' '}
                    {technicalBreakdown.componentD.triggerProcedureDescription}
                  </span>
                </div>
                <div>
                  <Info />
                  <span>
                    Ceiling rule: Modifier strictly capped at {technicalBreakdown.componentD.maxPoints} points
                  </span>
                </div>
              </div>
            )}

            <button className="v3-full-btn" onClick={() => setTechnicalOpen(true)}>
              View technical audit trail
            </button>
          </aside>
        </div>
      )}

      {/* MINI DRAWER FOR JOURNEY EVENT */}
      {selectedJourney && (
        <div className="v3-overlay" onClick={() => setSelectedJourney(null)}>
          <aside className="v3-mini-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>{selectedJourney.formattedDateTime}</span>
                <h2>{selectedJourney.title}</h2>
                <p>{selectedJourney.subtitle}</p>
              </div>
              <button onClick={() => setSelectedJourney(null)}>
                <X />
              </button>
            </div>
            <div className="v3-detail-list">
              {selectedJourney.details.map((d, i) => (
                <div key={i}>
                  <CheckCircle2 size={16} />
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <button className="v3-full-btn" onClick={() => nav(`/claims/${claimId}/timeline`)}>
              Open full patient timeline
            </button>
          </aside>
        </div>
      )}

      {/* TECHNICAL AUDIT MODAL */}
      {technicalOpen && (
        <div className="v3-overlay" onClick={() => setTechnicalOpen(false)}>
          <div className="v3-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>TECHNICAL AUDIT VIEW & TRACEABILITY</span>
                <h2>How the {signalResult.score}/100 signal was calculated</h2>
                <p>Reproducible audit record preserved with model, rules, and calculation SHA-256 hash.</p>
              </div>
              <button onClick={() => setTechnicalOpen(false)}>
                <X />
              </button>
            </div>
            <div className="v3-technical-table">
              {technicalBreakdown.rows.map((row) => (
                <div key={row.component}>
                  <span>Component {row.component} · {row.label}</span>
                  <strong>{row.bandAndDescription}</strong>
                  <b>{row.scoreDisplay}</b>
                </div>
              ))}
            </div>
            <div className="v3-tech-note" style={{ marginTop: '1rem', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Info size={17} />
                <strong>Calculation Audit Fingerprint:</strong>
              </div>
              <code style={{ fontSize: '11px', background: '#0f172a', color: '#38bdf8', padding: '6px 10px', borderRadius: '4px', width: '100%', wordBreak: 'break-all' }}>
                SHA256: {audit.calculationHash}
              </code>
              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: '#64748b' }}>
                <span>Ruleset: <strong>{audit.rulesVersion}</strong></span>
                <span>Model: <strong>{audit.modelVersion}</strong></span>
                <span>Data: <strong>{audit.dataVersion}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HUMAN REVIEW MODAL */}
      {reviewOpen && (
        <div className="v3-overlay" onClick={() => setReviewOpen(false)}>
          <div className="v3-modal" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>HUMAN REVIEW WORKFLOW</span>
                <h2>Submit review decision for {claimId}</h2>
                <p>Record the clinical determination without modifying the underlying immutable evidence.</p>
              </div>
              <button onClick={() => setReviewOpen(false)}>
                <X />
              </button>
            </div>
            <label className="v3-field">
              <span>Reviewer outcome</span>
              <select value={decision} onChange={(e) => setDecision(e.target.value)}>
                <option value="">Choose an outcome</option>
                <option>Confirm HAC concern</option>
                <option>Expected clinical progression</option>
                <option>Need more information</option>
                <option>Route to another provider</option>
                <option>Monitor only</option>
                <option>No concern</option>
              </select>
            </label>
            <label className="v3-field">
              <span>Clinical review rationale</span>
              <textarea
                rows={5}
                value={reviewRationale}
                onChange={(e) => setReviewRationale(e.target.value)}
                placeholder="Explain the decision and cite the relevant timeline evidence..."
              />
            </label>
            <div className="v3-modal-actions">
              <button className="v3-secondary-btn" onClick={() => setReviewOpen(false)}>
                Cancel
              </button>
              <button
                className="v3-primary-btn"
                disabled={!decision || submittingReview}
                onClick={handleSaveReview}
              >
                {submittingReview ? 'Saving...' : 'Save review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLINICAL NOTE MODAL */}
      {notesOpen && (
        <div className="v3-overlay" onClick={() => setNotesOpen(false)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>CLINICAL AUDIT NOTE</span>
                <h2>Add note for {claimId}</h2>
              </div>
              <button onClick={() => setNotesOpen(false)}>
                <X />
              </button>
            </div>
            <label className="v3-field">
              <span>Note content</span>
              <textarea
                rows={7}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Document clinical observations, operative review, or queries for hospital..."
              />
            </label>
            <div className="v3-modal-actions">
              <button className="v3-secondary-btn" onClick={() => setNotesOpen(false)}>
                Cancel
              </button>
              <button
                className="v3-primary-btn"
                disabled={!noteContent.trim() || submittingNote}
                onClick={handleSaveNote}
              >
                {submittingNote ? 'Saving...' : 'Add note'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      {searchOpen && (
        <div className="v3-overlay" onClick={() => setSearchOpen(false)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header">
              <div>
                <span>FIND IN CASE</span>
                <h2>Search claim evidence</h2>
              </div>
              <button onClick={() => setSearchOpen(false)}>
                <X />
              </button>
            </div>
            <label className="v3-search-box">
              <Search size={17} />
              <input autoFocus placeholder="Search diagnosis, procedure, event..." />
            </label>
            <div className="v3-search-hints">
              <span>Try:</span>
              <button onClick={() => { setSelectedEvidence('timing'); setSearchOpen(false); }}>
                74 hours
              </button>
              <button onClick={() => { setSelectedEvidence('intervention'); setSearchOpen(false); }}>
                Return to theatre
              </button>
              <button onClick={() => { setSelectedEvidence('path'); setSearchOpen(false); }}>
                Abscess
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
