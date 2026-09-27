/**
 * ============================================================================
 * REVIEW WORKFLOW SERVICE
 * ============================================================================
 * Manages clinical reviewer notes, human review decisions, case assignment,
 * and server-side paginated & filtered review queue queries.
 */

import {
  ClaimEntity,
  CreateReviewerNoteRequestDTO,
  HumanReviewDecisionDTO,
  ReviewerNoteDTO,
  ReviewQueueFilterDTO,
  ReviewQueueItemDTO,
  ReviewQueueResponseDTO,
  ReviewStatus,
  SubmitReviewDecisionRequestDTO,
} from '../contracts/hac.types.js';
import { INITIAL_SEED_CLAIMS } from '../data/seedClaims.js';
import { HacScoringService } from './HacScoringService.js';

export class ReviewWorkflowService {
  private static claimsStore: Map<string, ClaimEntity> = new Map(
    INITIAL_SEED_CLAIMS.map((c) => [c.claimId, { ...c }])
  );

  private static notesStore: Map<string, ReviewerNoteDTO[]> = new Map([
    [
      'CLM-2024-001',
      [
        {
          id: 'note-001',
          claimId: 'CLM-2024-001',
          author: 'Dr. Sarah Al-Busaidi',
          authorRole: 'Chief Clinical Auditor',
          content: 'Secondary wound infection diagnosed 74 hours post-appendicectomy. Case requires surgeon notes audit.',
          createdAt: '2024-01-19T08:30:00Z',
        },
      ],
    ],
  ]);

  private static decisionsStore: Map<string, HumanReviewDecisionDTO[]> = new Map();

  /**
   * Retrieves a claim entity by ID.
   */
  public static getClaim(claimId: string): ClaimEntity | undefined {
    return this.claimsStore.get(claimId);
  }

  /**
   * Retrieves all claims in storage.
   */
  public static getAllClaims(): ClaimEntity[] {
    return Array.from(this.claimsStore.values());
  }

  /**
   * Enriches and validates a raw or partial claim entity with required default values.
   */
  public static enrichClaim(raw: Partial<ClaimEntity>): ClaimEntity {
    const claimId = raw.claimId?.trim() || `CLM-2024-${String(this.claimsStore.size + 1).padStart(3, '0')}`;
    const patientId = raw.patientId?.trim() || `P-${Math.floor(10000 + Math.random() * 90000)}`;
    const admissionDateTime = raw.admissionDateTime || new Date().toISOString();
    const dischargeDateTime = raw.dischargeDateTime || new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();

    const admissionMs = new Date(admissionDateTime).getTime();
    const dischargeMs = new Date(dischargeDateTime).getTime();
    const calculatedStay = Math.max(1, Math.round((dischargeMs - admissionMs) / (1000 * 60 * 60 * 24)));

    const primaryDiagnosis = raw.primaryDiagnosis || {
      code: 'K35.80',
      description: 'Acute appendicitis',
      isPrimaryAdmissionDiagnosis: true,
      isSuspectedHacCondition: false,
      firstObservedDateTime: admissionDateTime,
    };

    const diagnoses = raw.diagnoses && raw.diagnoses.length > 0
      ? raw.diagnoses
      : [
          primaryDiagnosis,
          {
            code: 'T81.41XA',
            description: 'Infection following a procedure, superficial incisional surgical site',
            isPrimaryAdmissionDiagnosis: false,
            isSuspectedHacCondition: true,
            firstObservedDateTime: new Date(admissionMs + 72 * 3600 * 1000).toISOString(),
          },
        ];

    const procedures = raw.procedures && raw.procedures.length > 0
      ? raw.procedures
      : [
          {
            code: '47.09',
            description: 'Laparoscopic appendectomy',
            performedDateTime: new Date(admissionMs + 4 * 3600 * 1000).toISOString(),
            isPlannedOnAdmission: true,
          },
        ];

    return {
      claimId,
      patientId,
      patientAge: raw.patientAge || 48,
      patientGender: raw.patientGender || 'M',
      providerId: raw.providerId || 'PRV-GEN-9901',
      providerFacilityCode: raw.providerFacilityCode || 'FAC-GH-01',
      providerDisplayName: raw.providerDisplayName || 'General Hospital',
      admissionDateTime,
      dischargeDateTime,
      lengthOfStayDays: raw.lengthOfStayDays || calculatedStay,
      primaryDiagnosis,
      diagnoses,
      procedures,
      patientHistory: raw.patientHistory || [],
      isPatientHistoryAvailable: raw.isPatientHistoryAvailable ?? true,
      isPalliativeCareDocumented: raw.isPalliativeCareDocumented || false,
      isPlannedStagedProcedure: raw.isPlannedStagedProcedure || false,
      reviewStatus: raw.reviewStatus || 'NEW',
      assignedTo: raw.assignedTo,
    };
  }

  /**
   * Adds a single claim to the store.
   */
  public static addClaim(raw: Partial<ClaimEntity>): ClaimEntity {
    const claim = this.enrichClaim(raw);
    this.claimsStore.set(claim.claimId, claim);
    return claim;
  }

  /**
   * Adds multiple claims in batch to the store.
   */
  public static addClaims(rawClaims: Partial<ClaimEntity>[]): ClaimEntity[] {
    return rawClaims.map((c) => this.addClaim(c));
  }

  /**
   * Resets claims back to seed dataset.
   */
  public static resetToDefaults(): void {
    this.claimsStore = new Map(INITIAL_SEED_CLAIMS.map((c) => [c.claimId, { ...c }]));
  }


  /**
   * Adds a timestamped clinical note to a claim.
   */
  public static addNote(claimId: string, req: CreateReviewerNoteRequestDTO): ReviewerNoteDTO {
    const claim = this.getClaim(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const note: ReviewerNoteDTO = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      claimId,
      author: req.author || 'Reviewer',
      authorRole: req.authorRole || 'Clinical Reviewer',
      content: req.content,
      createdAt: new Date().toISOString(),
    };

    const existing = this.notesStore.get(claimId) || [];
    existing.push(note);
    this.notesStore.set(claimId, existing);

    return note;
  }

  /**
   * Retrieves all notes for a specific claim.
   */
  public static getNotes(claimId: string): ReviewerNoteDTO[] {
    return this.notesStore.get(claimId) || [];
  }

  /**
   * Records a human review decision and updates the claim status.
   */
  public static submitDecision(
    claimId: string,
    req: SubmitReviewDecisionRequestDTO
  ): HumanReviewDecisionDTO {
    const claim = this.getClaim(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }

    const previousStatus = claim.reviewStatus;
    let newStatus: ReviewStatus = 'IN_REVIEW';

    switch (req.outcome) {
      case 'CONFIRM_CONCERN':
        newStatus = 'CONFIRMED';
        break;
      case 'NO_CONCERN':
      case 'EXPECTED_PROGRESSION':
        newStatus = 'RESOLVED';
        break;
      case 'NEED_MORE_INFORMATION':
        newStatus = 'NEED_MORE_INFORMATION';
        break;
      case 'MONITOR':
        newStatus = 'MONITORING';
        break;
      case 'ESCALATE':
        newStatus = 'IN_REVIEW';
        break;
    }

    claim.reviewStatus = newStatus;
    this.claimsStore.set(claimId, claim);

    const decision: HumanReviewDecisionDTO = {
      id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      claimId,
      outcome: req.outcome,
      rationale: req.rationale,
      reviewerId: req.reviewerId,
      reviewerName: req.reviewerName || req.reviewerId,
      reviewedAt: new Date().toISOString(),
      previousStatus,
      newStatus,
    };

    const decisions = this.decisionsStore.get(claimId) || [];
    decisions.push(decision);
    this.decisionsStore.set(claimId, decisions);

    return decision;
  }

  /**
   * Retrieves the most recent review decision for a claim.
   */
  public static getLastDecision(claimId: string): HumanReviewDecisionDTO | undefined {
    const decisions = this.decisionsStore.get(claimId) || [];
    return decisions.length > 0 ? decisions[decisions.length - 1] : undefined;
  }

  /**
   * Queries and returns the server-side paginated review queue.
   */
  public static queryReviewQueue(filter: ReviewQueueFilterDTO): ReviewQueueResponseDTO {
    const page = Math.max(1, filter.page || 1);
    const pageSize = Math.max(1, Math.min(100, filter.pageSize || 10));

    // Calculate dynamic scores and classifications for all claims
    let allQueueItems: ReviewQueueItemDTO[] = Array.from(this.claimsStore.values()).map((claim) => {
      const notes = this.getNotes(claim.claimId);
      const lastDec = this.getLastDecision(claim.claimId);
      const investigation = HacScoringService.calculateInvestigation(
        claim,
        notes.length,
        lastDec?.outcome
      );

      const hacDiag =
        claim.diagnoses.find((d) => d.isSuspectedHacCondition) ||
        claim.diagnoses[1] ||
        claim.primaryDiagnosis;

      return {
        claimId: claim.claimId,
        patientId: claim.patientId,
        admissionDateTime: claim.admissionDateTime,
        dischargeDateTime: claim.dischargeDateTime,
        primaryDiagnosisCode: claim.primaryDiagnosis.code,
        hacDiagnosisCode: hacDiag.code,
        score: investigation.signalResult.score,
        signalLevel: investigation.signalResult.level,
        reviewStatus: claim.reviewStatus,
        providerId: claim.providerId,
        providerDisplayName: claim.providerDisplayName,
        assignedTo: claim.assignedTo,
        dataQualityStatus: investigation.dataQuality.overallStatus,
        notesCount: notes.length,
        lastDecision: lastDec?.outcome,
      };
    });

    // 1. Calculate overall summary counts before filtering
    const summaryCounts = {
      total: allQueueItems.length,
      highPriority: allQueueItems.filter((i) => i.signalLevel === 'HIGH').length,
      inReview: allQueueItems.filter((i) => i.reviewStatus === 'IN_REVIEW').length,
      confirmed: allQueueItems.filter((i) => i.reviewStatus === 'CONFIRMED').length,
    };

    // 2. Apply Filters
    if (filter.search && filter.search.trim() !== '') {
      const q = filter.search.trim().toLowerCase();
      allQueueItems = allQueueItems.filter(
        (i) =>
          i.claimId.toLowerCase().includes(q) ||
          i.patientId.toLowerCase().includes(q) ||
          i.primaryDiagnosisCode.toLowerCase().includes(q) ||
          i.hacDiagnosisCode.toLowerCase().includes(q) ||
          i.providerDisplayName.toLowerCase().includes(q)
      );
    }

    if (filter.signalLevel) {
      allQueueItems = allQueueItems.filter((i) => i.signalLevel === filter.signalLevel);
    }

    if (filter.providerId) {
      allQueueItems = allQueueItems.filter((i) => i.providerId === filter.providerId);
    }

    if (filter.reviewStatus) {
      allQueueItems = allQueueItems.filter((i) => i.reviewStatus === filter.reviewStatus);
    }

    if (filter.assignedTo) {
      allQueueItems = allQueueItems.filter((i) => i.assignedTo === filter.assignedTo);
    }

    if (filter.startDate) {
      const startMs = new Date(filter.startDate).getTime();
      allQueueItems = allQueueItems.filter((i) => new Date(i.admissionDateTime).getTime() >= startMs);
    }

    if (filter.endDate) {
      const endMs = new Date(filter.endDate).getTime();
      allQueueItems = allQueueItems.filter((i) => new Date(i.admissionDateTime).getTime() <= endMs);
    }

    // 3. Sorting
    const sortBy = filter.sortBy || 'score';
    const sortDir = filter.sortDirection === 'asc' ? 1 : -1;

    allQueueItems.sort((a, b) => {
      if (sortBy === 'score') {
        return (a.score - b.score) * sortDir;
      }
      if (sortBy === 'admissionDateTime') {
        return (new Date(a.admissionDateTime).getTime() - new Date(b.admissionDateTime).getTime()) * sortDir;
      }
      if (sortBy === 'claimId') {
        return a.claimId.localeCompare(b.claimId) * sortDir;
      }
      return 0;
    });

    // 4. Server-Side Pagination
    const total = allQueueItems.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = allQueueItems.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
      summaryCounts,
    };
  }
}
