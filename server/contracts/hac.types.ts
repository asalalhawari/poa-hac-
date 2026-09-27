/**
 * ============================================================================
 * HAC SIGNAL INVESTIGATION SYSTEM - CORE API CONTRACTS & DTOs
 * ============================================================================
 * High-reliability data structures for Hospital-Acquired Complication (HAC)
 * signal detection, scoring, auditability, and clinical review workflows.
 */

// ----------------------------------------------------------------------------
// Core Domain Primitives & Enums
// ----------------------------------------------------------------------------

export type HacSignalLevel = 'HIGH' | 'REVIEW' | 'MONITOR' | 'NONE';

/**
 * Fundamental Architectural Invariant:
 * The HAC signal is strictly a routing & audit mechanism for clinical review.
 * Automated claim denials, auto-rejections, or penalty deductions are NOT permitted.
 */
export type HacAction = 'HUMAN_REVIEW';

export type ReviewStatus = 'NEW' | 'IN_REVIEW' | 'NEED_MORE_INFORMATION' | 'CONFIRMED' | 'RESOLVED' | 'MONITORING';

export type HumanReviewDecisionOutcome =
  | 'CONFIRM_CONCERN'
  | 'NO_CONCERN'
  | 'NEED_MORE_INFORMATION'
  | 'EXPECTED_PROGRESSION'
  | 'ROUTE_OTHER_PROVIDER'
  | 'MONITOR'
  | 'ESCALATE';

export type ComponentABand = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6';
export type ComponentBBand = 'B1' | 'B2' | 'B3' | 'B_UNKNOWN';
export type ComponentCOutcome = 'UNRELATED' | 'UNKNOWN' | 'RECOGNIZED_PROGRESSION';
export type ComponentDCategory =
  | 'RETURN_TO_THEATRE'
  | 'HIGH_ACUITY_RESCUE'
  | 'UNPLANNED_OPERATION'
  | 'IMAGING_OR_ENDOSCOPY'
  | 'NONE';
export type ComponentEOutcome =
  | 'DIRECT_30D'
  | 'LINKED_90D'
  | 'CHRONIC_EPISODE'
  | 'NOTHING_FOUND'
  | 'UNAVAILABLE';

export type EventStatus = 'normal' | 'warning' | 'critical' | 'positive';
export type EventType =
  | 'admission'
  | 'diagnosis'
  | 'procedure'
  | 'imaging'
  | 'labs'
  | 'icu_transfer'
  | 'clinical_escalation'
  | 'discharge';

export type DataQualitySeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type DataQualityStatus = 'COMPLETE' | 'PARTIAL' | 'DEGRADED';

// ----------------------------------------------------------------------------
// Entities: Claim, Patient, Provider & Raw Clinical Line Items
// ----------------------------------------------------------------------------

export interface DiagnosisEntry {
  code: string;
  description: string;
  isPrimaryAdmissionDiagnosis: boolean;
  isSuspectedHacCondition: boolean;
  firstObservedDateTime?: string; // ISO-8601 (Required for POA calculation)
  poaExempt?: boolean;
}

export interface ProcedureEntry {
  code: string;
  description: string;
  performedDateTime?: string; // ISO-8601
  anatomicalSite?: string;
  isPlannedOnAdmission: boolean;
  isReturnToTheatre?: boolean;
  isRescueIntervention?: boolean;
}

export interface PatientHistoryItem {
  id: string;
  claimId: string;
  providerId: string;
  facilityCode: string;
  serviceDateTime: string; // ISO-8601
  procedureCode?: string;
  procedureDescription?: string;
  diagnosisCode?: string;
  isRelatedToCurrentCondition: boolean;
  daysPriorToAdmission: number;
}

export interface ClaimEntity {
  claimId: string;
  patientId: string;
  patientAge?: number;
  patientGender?: 'M' | 'F' | 'OTHER';
  
  // Provider identifier - strictly separated from free-text names for compliance & integrity
  providerId: string;
  providerFacilityCode: string;
  providerDisplayName: string;
  
  // Exact admission and discharge timestamps (ISO-8601)
  admissionDateTime: string;
  dischargeDateTime?: string;
  lengthOfStayDays: number;
  
  primaryDiagnosis: DiagnosisEntry;
  diagnoses: DiagnosisEntry[];
  procedures: ProcedureEntry[];
  
  // Longitudinal patient history records within lookback window
  patientHistory?: PatientHistoryItem[];
  isPatientHistoryAvailable: boolean;
  
  // Clinical flags
  isPalliativeCareDocumented?: boolean;
  isPlannedStagedProcedure?: boolean;
  
  // Workflow state
  reviewStatus: ReviewStatus;
  assignedTo?: string;
}

// ----------------------------------------------------------------------------
// Detailed Component Scores (A through E)
// ----------------------------------------------------------------------------

export interface ComponentAScore {
  component: 'A';
  title: string;
  code: string;
  description: string;
  band: ComponentABand;
  bandLabel: string;
  points: number;
  maxPoints: number;
  reasoning: string;
}

export interface ComponentBScore {
  component: 'B';
  title: string;
  band: ComponentBBand;
  bandLabel: string;
  admissionDateTime: string;
  firstObservedDateTime: string | null;
  elapsedHoursFromAdmission: number | null;
  thresholdHours: number;
  earlyWindowHours: number;
  points: number;
  maxPoints: number;
  timingInferred: boolean;
  reasoning: string;
}

export interface ComponentCScore {
  component: 'C';
  title: string;
  outcome: ComponentCOutcome;
  outcomeLabel: string;
  points: number;
  maxPoints: number;
  pathwaySimilarityPercent: number;
  deviationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedPathway: string[];
  actualPathway: string[];
  divergencePoint: string;
  reasoning: string;
}

export interface ComponentDScore {
  component: 'D';
  title: string;
  category: ComponentDCategory;
  categoryLabel: string;
  triggerProcedureCode?: string;
  triggerProcedureDescription?: string;
  rawModifierPoints: number;
  points: number; // Capped at interventionScoreCap (typically 25)
  maxPoints: number;
  isCeilingApplied: boolean;
  reasoning: string;
}

export interface ComponentEScore {
  component: 'E';
  title: string;
  outcome: ComponentEOutcome;
  outcomeLabel: string;
  lookbackDaysSearched: number;
  historyAvailable: boolean;
  linkedPriorClaimId?: string;
  linkedPriorProcedure?: string;
  linkedPriorDays?: number;
  points: number;
  maxPoints: number;
  reasoning: string;
}

// ----------------------------------------------------------------------------
// Suppressors & Modifiers
// ----------------------------------------------------------------------------

export interface AppliedSuppressor {
  suppressorId: string;
  name: string;
  triggered: boolean;
  scoreBeforeSuppression: number;
  scoreAfterSuppression: number;
  reasoning: string;
}

// ----------------------------------------------------------------------------
// Data Quality Checks
// ----------------------------------------------------------------------------

export interface DataQualityFlag {
  code: string;
  severity: DataQualitySeverity;
  field: string;
  message: string;
  mitigation: string;
}

export interface DataQualitySummary {
  overallStatus: DataQualityStatus;
  isReliable: boolean;
  flags: DataQualityFlag[];
}

// ----------------------------------------------------------------------------
// Timeline & Evidence Cards (UI Presentation DTOs)
// ----------------------------------------------------------------------------

export interface TimelineEventDTO {
  id: string;
  dateTime: string; // ISO-8601
  formattedDateTime: string;
  elapsedHours: number | null;
  eventType: EventType;
  title: string;
  subtitle: string;
  status: EventStatus;
  details: string[];
  code?: string;
}

export interface FindingCardDTO {
  key: 'timing' | 'path' | 'intervention' | 'coding' | 'history';
  title: string;
  headline: string;
  summary: string;
  level: string;
  tone: 'high' | 'critical' | 'medium' | 'neutral' | 'positive';
  points: number;
  maxPoints: number;
}

export interface TechnicalComponentRowDTO {
  component: string;
  label: string;
  bandAndDescription: string;
  scoreDisplay: string;
  points: number;
  maxPoints: number;
}

// ----------------------------------------------------------------------------
// Audit Trail & Reproducibility
// ----------------------------------------------------------------------------

export interface AuditMetadataDTO {
  modelVersion: string;
  rulesVersion: string;
  calculatedAt: string; // ISO-8601
  dataVersion: string;
  calculationHash: string; // SHA-256
}

// ----------------------------------------------------------------------------
// Main Investigation API Response Payload
// ----------------------------------------------------------------------------

export interface HacInvestigationPayloadDTO {
  claimId: string;
  patientId: string;
  patientAge?: number;
  patientGender?: 'M' | 'F' | 'OTHER';
  provider: {
    id: string;
    facilityCode: string;
    displayName: string;
  };
  stayTimestamps: {
    admissionDateTime: string; // ISO-8601
    dischargeDateTime?: string; // ISO-8601
    lengthOfStayDays: number;
  };
  signalResult: {
    score: number; // 0 - 100
    level: HacSignalLevel;
    action: HacAction; // Always 'HUMAN_REVIEW'
    summaryHeadline: string;
    summaryDescription: string;
  };
  findingsCards: FindingCardDTO[];
  technicalBreakdown: {
    rows: TechnicalComponentRowDTO[];
    componentA: ComponentAScore;
    componentB: ComponentBScore;
    componentC: ComponentCScore;
    componentD: ComponentDScore;
    componentE: ComponentEScore;
  };
  timeline: TimelineEventDTO[];
  clinicalPath: {
    expected: string[];
    actual: string[];
    divergencePoint: string;
    similarityPercent: number;
    deviationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  };
  dataQuality: DataQualitySummary;
  suppressors: {
    applied: AppliedSuppressor[];
    isScoreCapped: boolean;
  };
  workflow: {
    reviewStatus: ReviewStatus;
    assignedTo?: string;
    notesCount: number;
    lastDecision?: HumanReviewDecisionOutcome;
  };
  audit: AuditMetadataDTO;
}

// ----------------------------------------------------------------------------
// Reviewer Notes & Decisions DTOs
// ----------------------------------------------------------------------------

export interface ReviewerNoteDTO {
  id: string;
  claimId: string;
  author: string;
  authorRole: string;
  content: string;
  createdAt: string; // ISO-8601
}

export interface CreateReviewerNoteRequestDTO {
  author: string;
  authorRole?: string;
  content: string;
}

export interface HumanReviewDecisionDTO {
  id: string;
  claimId: string;
  outcome: HumanReviewDecisionOutcome;
  rationale: string;
  reviewerId: string;
  reviewerName?: string;
  reviewedAt: string; // ISO-8601
  previousStatus: ReviewStatus;
  newStatus: ReviewStatus;
}

export interface SubmitReviewDecisionRequestDTO {
  outcome: HumanReviewDecisionOutcome;
  rationale: string;
  reviewerId: string;
  reviewerName?: string;
}

// ----------------------------------------------------------------------------
// Review Queue DTOs
// ----------------------------------------------------------------------------

export interface ReviewQueueFilterDTO {
  search?: string;
  signalLevel?: HacSignalLevel;
  providerId?: string;
  startDate?: string;
  endDate?: string;
  assignedTo?: string;
  reviewStatus?: ReviewStatus;
  page?: number;
  pageSize?: number;
  sortBy?: 'score' | 'admissionDateTime' | 'claimId' | 'signalLevel';
  sortDirection?: 'asc' | 'desc';
}

export interface ReviewQueueItemDTO {
  claimId: string;
  patientId: string;
  admissionDateTime: string;
  dischargeDateTime?: string;
  primaryDiagnosisCode: string;
  hacDiagnosisCode: string;
  score: number;
  signalLevel: HacSignalLevel;
  reviewStatus: ReviewStatus;
  providerId: string;
  providerDisplayName: string;
  assignedTo?: string;
  dataQualityStatus: DataQualityStatus;
  notesCount: number;
  lastDecision?: HumanReviewDecisionOutcome;
}

export interface ReviewQueueResponseDTO {
  items: ReviewQueueItemDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  summaryCounts: {
    total: number;
    highPriority: number;
    inReview: number;
    confirmed: number;
  };
}

// ----------------------------------------------------------------------------
// Dynamic Configuration DTO
// ----------------------------------------------------------------------------

export interface HacConfigDTO {
  thresholds: {
    midStayThresholdHours: number; // default: 48
    earlyWindowHours: number;      // default: 24
    historyLookbackDays: number;   // default: 90
    interventionScoreCap: number;  // default: 25
  };
  signalLevelCutoffs: {
    high: number;    // default: 65
    review: number;  // default: 50
    monitor: number; // default: 25
  };
  componentWeights: {
    maxA: number; // 20
    maxB: number; // 20
    maxC: number; // 20
    maxD: number; // 25
    maxE: number; // 15
  };
  suppressors: {
    enablePalliativeCareExclusion: boolean;
    enablePlannedStagedExclusion: boolean;
  };
  audit: {
    modelVersion: string;
    rulesVersion: string;
    dataVersion: string;
  };
}
