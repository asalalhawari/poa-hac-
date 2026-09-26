import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
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

type EvidenceKey = 'timing' | 'path' | 'intervention' | 'history' | 'coding';

type JourneyItem = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  status: 'normal' | 'warning' | 'critical' | 'positive';
  details: string[];
};

const evidenceCards = [
  {
    key: 'timing' as EvidenceKey,
    icon: Clock3,
    title: 'New condition appeared after admission',
    headline: 'First detected 74 hours after admission',
    summary: 'The diagnosis was not present on admission-day claim lines and first appeared after the 48-hour threshold.',
    level: 'Strong evidence',
    tone: 'high',
    points: 20,
    max: 20,
  },
  {
    key: 'path' as EvidenceKey,
    icon: Network,
    title: 'Patient path changed unexpectedly',
    headline: 'The new condition does not fit the expected recovery path',
    summary: 'Historical and clinical pathway evidence indicates that this sequence is not a recognised progression of the admitting condition.',
    level: 'Strong evidence',
    tone: 'high',
    points: 20,
    max: 20,
  },
  {
    key: 'intervention' as EvidenceKey,
    icon: HeartPulse,
    title: 'Unexpected intervention was required',
    headline: 'Patient returned to theatre',
    summary: 'A second operation occurred in the same body system after the new condition appeared.',
    level: 'Very strong evidence',
    tone: 'critical',
    points: 25,
    max: 25,
  },
  {
    key: 'coding' as EvidenceKey,
    icon: FileText,
    title: 'Diagnosis wording supports a complication pattern',
    headline: 'Cause-neutral complication pattern detected',
    summary: 'The diagnosis itself does not state the cause, but it matches a code pattern that can represent a post-procedural complication.',
    level: 'Supporting evidence',
    tone: 'medium',
    points: 12,
    max: 20,
  },
  {
    key: 'history' as EvidenceKey,
    icon: History,
    title: 'Previous provider history checked',
    headline: 'No relevant earlier procedure found',
    summary: 'The available 90-day history was searched. No earlier procedure relevant to this event was identified.',
    level: 'No added evidence',
    tone: 'neutral',
    points: 0,
    max: 15,
  },
];

const journey: JourneyItem[] = [
  {
    id: 'admission', date: '15 Jan · 08:10', title: 'Admitted', subtitle: 'Acute appendicitis', status: 'normal',
    details: ['Admission diagnosis: K35.80', 'Inpatient admission', 'No abdominal-wall abscess on admission-day lines'],
  },
  {
    id: 'procedure', date: '15 Jan · 14:20', title: 'Planned surgery', subtitle: 'Appendicectomy', status: 'positive',
    details: ['Initial operative treatment', 'Procedure was part of the admission plan', 'Same abdominal body system'],
  },
  {
    id: 'diagnosis', date: '18 Jan · 10:15', title: 'New condition', subtitle: 'Abdominal-wall abscess', status: 'warning',
    details: ['Diagnosis: L02.211', 'First appearance: 74 hours after admission', 'Not present on admission-day lines'],
  },
  {
    id: 'escalation', date: '18 Jan · 12:40', title: 'Clinical escalation', subtitle: 'Surgical review', status: 'warning',
    details: ['Condition triggered additional clinical review', 'Specialty involvement increased', 'Event occurred after the new diagnosis appeared'],
  },
  {
    id: 'return', date: '18 Jan · 16:05', title: 'Returned to theatre', subtitle: 'Incision & drainage', status: 'critical',
    details: ['Unplanned second operation', 'Same body system as earlier operation', 'Strongest intervention signal'],
  },
  {
    id: 'discharge', date: '22 Jan · 13:10', title: 'Discharged', subtitle: 'Stay completed', status: 'positive',
    details: ['Discharged after treatment', 'Claim retained for human review', 'No automatic denial applied'],
  },
];

const technicalRows = [
  ['Diagnosis pattern', 'A3 · Cause-neutral stand-in', '12 / 20'],
  ['Timing / inferred POA', 'B1 · First appears ≥48h', '20 / 20'],
  ['Clinical relatedness', 'C1 · Unrelated', '20 / 20'],
  ['Triggered intervention', 'D1 · Return to theatre', '25 / 25'],
  ['Provider linkage', 'E4 · Nothing found', '0 / 15'],
];

export default function ClaimDetails() {
  const { claimId } = useParams();
  const nav = useNavigate();
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceKey | null>(null);
  const [selectedJourney, setSelectedJourney] = useState<JourneyItem | null>(null);
  const [technicalOpen, setTechnicalOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [decision, setDecision] = useState('');

  const total = useMemo(() => evidenceCards.reduce((s, e) => s + e.points, 0), []);
  const currentEvidence = evidenceCards.find((item) => item.key === selectedEvidence) ?? null;

  return (
    <div className="hac-v3-page">
      <div className="hac-v3-topbar">
        <button className="v3-ghost-btn" onClick={() => nav('/claims')}><ArrowLeft size={17}/> Claims</button>
        <div className="v3-topbar-right">
          <button className="v3-icon-btn" title="Search" onClick={() => setSearchOpen(true)}><Search size={17}/></button>
          <button className="v3-secondary-btn" onClick={() => setNotesOpen(true)}>Add note</button>
          <button className="v3-primary-btn" onClick={() => setReviewOpen(true)}>Review case <ArrowRight size={16}/></button>
        </div>
      </div>

      <header className="v3-case-header">
        <div>
          <div className="v3-kicker">HAC SIGNAL · CLAIM INVESTIGATION</div>
          <h1>Potential hospital-acquired complication detected</h1>
          <p>{claimId ?? 'CLM-2026-001'} · Patient P-45872 · General Hospital</p>
        </div>
        <div className="v3-case-badges">
          <span className="v3-pill critical"><AlertTriangle size={14}/> High priority</span>
          <span className="v3-pill"><ShieldCheck size={14}/> Human review required</span>
        </div>
      </header>

      <section className="v3-story-grid">
        <article className="v3-score-hero">
          <div className="v3-score-donut"><strong>{total}</strong><span>/100</span></div>
          <div className="v3-score-copy">
            <span>Overall signal</span>
            <h2>High likelihood of an in-stay complication pattern</h2>
            <p>The signal is driven mainly by a new condition appearing late in the stay and an unplanned return to theatre.</p>
            <div className="v3-hero-actions">
              <button onClick={() => setTechnicalOpen(true)}>How was this calculated? <ChevronRight size={14}/></button>
              <button onClick={() => setSelectedJourney(journey[2])}>Show key event <ChevronRight size={14}/></button>
            </div>
          </div>
        </article>

        <article className="v3-summary-panel">
          <div className="v3-summary-item"><span>What changed?</span><strong>New abdominal-wall abscess</strong><small>First seen 74h after admission</small></div>
          <div className="v3-summary-item"><span>What made it serious?</span><strong>Unplanned return to theatre</strong><small>Incision & drainage</small></div>
          <div className="v3-summary-item"><span>Does it fit the original illness?</span><strong className="v3-danger-text">No recognised progression</strong><small>Flagged for clinical review</small></div>
          <div className="v3-summary-item"><span>What happens now?</span><strong>Reviewer decides</strong><small>No automatic denial or reduction</small></div>
        </article>
      </section>

      <section className="v3-section">
        <div className="v3-section-heading">
          <div><span>WHY THIS CLAIM WAS FLAGGED</span><h2>Evidence story</h2><p>Open any card to see the exact data behind the signal.</p></div>
          <div className="v3-confidence"><BrainCircuit size={16}/><span>AI evidence confidence</span><strong>High</strong></div>
        </div>

        <div className="v3-evidence-grid">
          {evidenceCards.map(({ key, icon: Icon, title, headline, level, tone, points, max }) => (
            <button key={key} className={`v3-evidence-card ${tone}`} onClick={() => setSelectedEvidence(key)}>
              <div className="v3-evidence-card-top"><div className="v3-evidence-icon"><Icon size={19}/></div><span>{level}</span></div>
              <h3>{title}</h3>
              <p>{headline}</p>
              <div className="v3-evidence-card-footer"><span>View evidence</span><div><strong>{points}</strong><small>/{max}</small><ChevronRight size={16}/></div></div>
            </button>
          ))}
        </div>
      </section>

      <section className="v3-section">
        <div className="v3-section-heading">
          <div><span>PATIENT JOURNEY</span><h2>See where the journey changed</h2><p>Each event is clickable and explains what happened at that point in the stay.</p></div>
          <button className="v3-secondary-btn" onClick={() => nav(`/claims/${claimId}/timeline`)}>Open full timeline</button>
        </div>

        <div className="v3-journey">
          {journey.map((item, index) => (
            <button key={item.id} className={`v3-journey-step ${item.status}`} onClick={() => setSelectedJourney(item)}>
              <div className="v3-journey-index">{index + 1}</div>
              <div className="v3-journey-line" />
              <span>{item.date}</span>
              <strong>{item.title}</strong>
              <small>{item.subtitle}</small>
              <em>Open details <ChevronRight size={12}/></em>
            </button>
          ))}
        </div>
      </section>

      <section className="v3-two-column">
        <article className="v3-panel v3-path-panel">
          <div className="v3-panel-heading"><div><span>CLINICAL PATH</span><h2>Expected vs actual journey</h2></div><button onClick={() => setSelectedEvidence('path')}>Explain <ChevronRight size={14}/></button></div>
          <div className="v3-path-row expected"><span>Expected</span><div><b>Appendicitis</b><ArrowRight/><b>Appendicectomy</b><ArrowRight/><b>Recovery</b><ArrowRight/><b>Discharge</b></div></div>
          <div className="v3-path-row actual"><span>Actual</span><div><b>Appendicitis</b><ArrowRight/><b>Appendicectomy</b><ArrowRight/><b className="v3-node-alert">Abscess</b><ArrowRight/><b className="v3-node-alert">Return to theatre</b></div></div>
          <div className="v3-ai-strip"><Sparkles size={17}/><div><span>AI supporting evidence</span><strong>Path similarity 31% · High deviation confidence</strong></div><button onClick={() => setSelectedEvidence('path')}>See why</button></div>
        </article>

        <article className="v3-panel">
          <div className="v3-panel-heading"><div><span>DATA QUALITY</span><h2>Can this result be trusted?</h2></div><span className="v3-pill good"><CheckCircle2 size={14}/> Evidence complete</span></div>
          <div className="v3-check-list">
            <button onClick={() => setSelectedEvidence('timing')}><CheckCircle2/><div><strong>Admission timing available</strong><span>Admission and first diagnosis times can be compared</span></div><ChevronRight/></button>
            <button onClick={() => setSelectedEvidence('intervention')}><CheckCircle2/><div><strong>Procedure data available</strong><span>Return-to-theatre event could be classified</span></div><ChevronRight/></button>
            <button onClick={() => setSelectedEvidence('history')}><CheckCircle2/><div><strong>Member history available</strong><span>90-day lookback was searched</span></div><ChevronRight/></button>
          </div>
        </article>
      </section>

      <section className="v3-review-banner">
        <div><Stethoscope size={22}/><div><span>NEXT STEP</span><h2>Human review is required before any payment decision</h2><p>The score routes the claim for review; it does not deny the claim automatically.</p></div></div>
        <button className="v3-primary-btn" onClick={() => setReviewOpen(true)}>Start review <ArrowRight size={16}/></button>
      </section>

      {currentEvidence && (
        <div className="v3-overlay" onClick={() => setSelectedEvidence(null)}>
          <aside className="v3-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>EVIDENCE DETAILS</span><h2>{currentEvidence.title}</h2></div><button onClick={() => setSelectedEvidence(null)}><X/></button></div>
            <div className="v3-drawer-score"><div><strong>{currentEvidence.points}</strong><span>/{currentEvidence.max}</span></div><p>{currentEvidence.level}</p></div>
            <div className="v3-detail-block"><span>What the system found</span><h3>{currentEvidence.headline}</h3><p>{currentEvidence.summary}</p></div>
            {currentEvidence.key === 'timing' && <TimingDetail />}
            {currentEvidence.key === 'path' && <PathDetail />}
            {currentEvidence.key === 'intervention' && <InterventionDetail />}
            {currentEvidence.key === 'history' && <HistoryDetail />}
            {currentEvidence.key === 'coding' && <CodingDetail />}
            <button className="v3-full-btn" onClick={() => setTechnicalOpen(true)}>View technical calculation</button>
          </aside>
        </div>
      )}

      {selectedJourney && (
        <div className="v3-overlay" onClick={() => setSelectedJourney(null)}>
          <aside className="v3-mini-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>{selectedJourney.date}</span><h2>{selectedJourney.title}</h2><p>{selectedJourney.subtitle}</p></div><button onClick={() => setSelectedJourney(null)}><X/></button></div>
            <div className="v3-detail-list">{selectedJourney.details.map((d) => <div key={d}><CheckCircle2 size={16}/><span>{d}</span></div>)}</div>
            <button className="v3-full-btn" onClick={() => nav(`/claims/${claimId}/timeline`)}>Open full patient timeline</button>
          </aside>
        </div>
      )}

      {technicalOpen && (
        <div className="v3-overlay" onClick={() => setTechnicalOpen(false)}>
          <div className="v3-modal wide" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>TECHNICAL AUDIT VIEW</span><h2>How the 77/100 signal was calculated</h2><p>Internal scoring details are kept here for audit and validation, not as the main user experience.</p></div><button onClick={() => setTechnicalOpen(false)}><X/></button></div>
            <div className="v3-technical-table">{technicalRows.map(([label, band, score]) => <div key={label}><span>{label}</span><strong>{band}</strong><b>{score}</b></div>)}</div>
            <div className="v3-tech-note"><Info size={17}/><p>Final signal: 77/100. No suppressor ceiling applied. Result routes the claim to human review.</p></div>
          </div>
        </div>
      )}

      {reviewOpen && (
        <div className="v3-overlay" onClick={() => setReviewOpen(false)}>
          <div className="v3-modal" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>HUMAN REVIEW</span><h2>Review this case</h2><p>Record the reviewer outcome without changing the underlying signal evidence.</p></div><button onClick={() => setReviewOpen(false)}><X/></button></div>
            <label className="v3-field"><span>Reviewer outcome</span><select value={decision} onChange={(e) => setDecision(e.target.value)}><option value="">Choose an outcome</option><option>Confirm HAC concern</option><option>Expected clinical progression</option><option>Need more information</option><option>Route to another provider</option><option>Monitor only</option><option>No concern</option></select></label>
            <label className="v3-field"><span>Review note</span><textarea rows={5} placeholder="Explain the decision and cite the relevant evidence..." /></label>
            <div className="v3-modal-actions"><button className="v3-secondary-btn" onClick={() => setReviewOpen(false)}>Cancel</button><button className="v3-primary-btn" disabled={!decision} onClick={() => setReviewOpen(false)}>Save review</button></div>
          </div>
        </div>
      )}

      {notesOpen && (
        <div className="v3-overlay" onClick={() => setNotesOpen(false)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>CASE NOTE</span><h2>Add reviewer note</h2></div><button onClick={() => setNotesOpen(false)}><X/></button></div>
            <label className="v3-field"><span>Note</span><textarea rows={7} placeholder="Write a note about this claim..." /></label>
            <div className="v3-modal-actions"><button className="v3-secondary-btn" onClick={() => setNotesOpen(false)}>Cancel</button><button className="v3-primary-btn" onClick={() => setNotesOpen(false)}>Add note</button></div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="v3-overlay" onClick={() => setSearchOpen(false)}>
          <div className="v3-modal small" onClick={(e) => e.stopPropagation()}>
            <div className="v3-drawer-header"><div><span>FIND IN CASE</span><h2>Search claim evidence</h2></div><button onClick={() => setSearchOpen(false)}><X/></button></div>
            <label className="v3-search-box"><Search size={17}/><input autoFocus placeholder="Search diagnosis, procedure, event..." /></label>
            <div className="v3-search-hints"><span>Try:</span><button onClick={() => setSelectedEvidence('timing')}>74 hours</button><button onClick={() => setSelectedEvidence('intervention')}>Return to theatre</button><button onClick={() => setSelectedEvidence('path')}>Abscess</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimingDetail() {
  return <><div className="v3-timing-visual"><div className="v3-time-line"/><div className="v3-time-mark m0"><i/><b>Admission</b><span>0h</span></div><div className="v3-time-mark m24"><i/><b>24h</b><span>Early window</span></div><div className="v3-time-mark m48"><i/><b>48h</b><span>Mid-stay threshold</span></div><div className="v3-time-mark m74"><i/><b>Diagnosis</b><span>74h</span></div></div><div className="v3-detail-list"><div><CheckCircle2/><span>Diagnosis absent from admission-day lines</span></div><div><CheckCircle2/><span>First appearance occurred after the 48-hour threshold</span></div><div><CheckCircle2/><span>Timing is inferred from claim service-line dates</span></div></div></>;
}

function PathDetail() {
  return <><div className="v3-path-compare"><div><span>Expected path</span><p>Appendicitis → surgery → recovery → discharge</p></div><div className="alert"><span>Observed path</span><p>Appendicitis → surgery → abscess → return to theatre</p></div></div><div className="v3-ai-box"><BrainCircuit/><div><span>AI supporting evidence</span><strong>31% pathway similarity</strong><p>The largest deviation begins when the new abscess appears and is followed by an unplanned second operation.</p></div></div></>;
}

function InterventionDetail() {
  return <div className="v3-intervention-scale"><div><span>Nothing</span><b>0</b></div><div><span>Imaging only</span><b>8</b></div><div><span>Unplanned operation</span><b>14</b></div><div><span>Rescue</span><b>20</b></div><div className="active"><span>Return to theatre</span><b>25</b></div></div>;
}

function HistoryDetail() {
  return <div className="v3-detail-list"><div><CheckCircle2/><span>Member history was available for the configured lookback period</span></div><div><CheckCircle2/><span>90-day history was searched</span></div><div><Info/><span>No relevant earlier procedure was found; absence is recorded separately from unavailable history</span></div></div>;
}

function CodingDetail() {
  return <><div className="v3-code-card"><span>Diagnosis on claim</span><strong>L02.211</strong><p>Cutaneous abscess of abdominal wall</p></div><div className="v3-detail-list"><div><GitBranch/><span>Matches a cause-neutral diagnosis pattern that can stand in for a post-procedural complication code</span></div><div><Info/><span>This evidence cannot carry the claim by itself; it is supporting evidence only</span></div></div></>;
}
