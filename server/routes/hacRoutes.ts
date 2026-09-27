/**
 * ============================================================================
 * HAC INVESTIGATION & WORKFLOW API ROUTES
 * ============================================================================
 * Production-ready Express router implementing:
 * - GET  /api/hac/claims/:claimId/investigation
 * - GET  /api/hac/claims/:claimId/notes
 * - POST /api/hac/claims/:claimId/notes
 * - POST /api/hac/claims/:claimId/review
 * - GET  /api/hac/review-queue
 * - GET  /api/hac/config
 * - PUT  /api/hac/config
 */

import { Request, Response, Router } from 'express';
import { HacConfigService } from '../config/hacConfig.js';
import {
  CreateReviewerNoteRequestDTO,
  HacSignalLevel,
  HumanReviewDecisionOutcome,
  ReviewQueueFilterDTO,
  ReviewStatus,
  SubmitReviewDecisionRequestDTO,
} from '../contracts/hac.types.js';
import { HacScoringService } from '../services/HacScoringService.js';
import { ReviewWorkflowService } from '../services/ReviewWorkflowService.js';

export const hacRouter = Router();

/**
 * ----------------------------------------------------------------------------
 * 1. GET /api/hac/claims/:claimId/investigation
 * Main investigation endpoint returning aggregated score, findings, POA timing,
 * clinical path, intervention modifier, history linkage, data quality, and audit.
 * ----------------------------------------------------------------------------
 */
hacRouter.get('/claims/:claimId/investigation', (req: Request<{ claimId: string }>, res: Response) => {
  try {
    const { claimId } = req.params;

    if (!claimId || claimId.trim() === '') {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'A non-empty claimId parameter is required.',
      });
      return;
    }

    const claim = ReviewWorkflowService.getClaim(claimId);
    if (!claim) {
      res.status(404).json({
        error: 'CLAIM_NOT_FOUND',
        message: `Claim with ID '${claimId}' was not found in the investigation registry.`,
      });
      return;
    }

    const notes = ReviewWorkflowService.getNotes(claimId);
    const lastDecision = ReviewWorkflowService.getLastDecision(claimId);

    // Backend-driven calculation - single source of truth
    const payload = HacScoringService.calculateInvestigation(
      claim,
      notes.length,
      lastDecision?.outcome
    );

    res.status(200).json(payload);
  } catch (error: any) {
    console.error(`[HAC API Error] Investigation calculation failed:`, error);
    res.status(500).json({
      error: 'CALCULATION_ERROR',
      message: 'An internal error occurred during HAC signal investigation scoring.',
      details: error?.message || 'Unknown error',
    });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 2. GET /api/hac/claims/:claimId/notes
 * Retrieves all clinical reviewer notes for a claim.
 * ----------------------------------------------------------------------------
 */
hacRouter.get('/claims/:claimId/notes', (req: Request<{ claimId: string }>, res: Response) => {
  try {
    const { claimId } = req.params;
    const claim = ReviewWorkflowService.getClaim(claimId);

    if (!claim) {
      res.status(404).json({
        error: 'CLAIM_NOT_FOUND',
        message: `Claim with ID '${claimId}' does not exist.`,
      });
      return;
    }

    const notes = ReviewWorkflowService.getNotes(claimId);
    res.status(200).json({
      claimId,
      totalNotes: notes.length,
      notes,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 3. POST /api/hac/claims/:claimId/notes
 * Adds a timestamped clinical reviewer note to a claim.
 * ----------------------------------------------------------------------------
 */
hacRouter.post('/claims/:claimId/notes', (req: Request<{ claimId: string }>, res: Response) => {
  try {
    const { claimId } = req.params;
    const { author, authorRole, content } = req.body as CreateReviewerNoteRequestDTO;

    if (!content || content.trim() === '') {
      res.status(400).json({
        error: 'INVALID_NOTE_CONTENT',
        message: 'The clinical note content cannot be empty.',
      });
      return;
    }

    const note = ReviewWorkflowService.addNote(claimId, {
      author: author || 'Clinical Reviewer',
      authorRole: authorRole || 'Nurse Reviewer',
      content: content.trim(),
    });

    res.status(201).json(note);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'CLAIM_NOT_FOUND', message: error.message });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 4. POST /api/hac/claims/:claimId/review
 * Records a human reviewer decision on the claim.
 * Validates outcome against strict enum.
 * ----------------------------------------------------------------------------
 */
hacRouter.post('/claims/:claimId/review', (req: Request<{ claimId: string }>, res: Response) => {
  try {
    const { claimId } = req.params;
    const { outcome, rationale, reviewerId, reviewerName } = req.body as SubmitReviewDecisionRequestDTO;

    const validOutcomes: HumanReviewDecisionOutcome[] = [
      'CONFIRM_CONCERN',
      'NO_CONCERN',
      'NEED_MORE_INFORMATION',
      'EXPECTED_PROGRESSION',
      'ROUTE_OTHER_PROVIDER',
      'MONITOR',
      'ESCALATE',
    ];

    if (!outcome || !validOutcomes.includes(outcome)) {
      res.status(400).json({
        error: 'INVALID_DECISION_OUTCOME',
        message: `Outcome must be one of: ${validOutcomes.join(', ')}`,
      });
      return;
    }

    if (!rationale || rationale.trim() === '') {
      res.status(400).json({
        error: 'MISSING_RATIONALE',
        message: 'A clinical rationale must be documented when submitting a review decision.',
      });
      return;
    }

    const decision = ReviewWorkflowService.submitDecision(claimId, {
      outcome,
      rationale: rationale.trim(),
      reviewerId: reviewerId || 'USER-REV-01',
      reviewerName: reviewerName || 'Reviewer',
    });

    res.status(200).json({
      message: 'Review decision successfully recorded.',
      decision,
    });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      res.status(404).json({ error: 'CLAIM_NOT_FOUND', message: error.message });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 5. GET /api/hac/review-queue
 * Server-side paginated review queue with filtering and dynamic scoring.
 * ----------------------------------------------------------------------------
 */
hacRouter.get('/review-queue', (req: Request, res: Response) => {
  try {
    const filter: ReviewQueueFilterDTO = {
      search: req.query.search as string | undefined,
      signalLevel: req.query.signalLevel as HacSignalLevel | undefined,
      providerId: req.query.providerId as string | undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      reviewStatus: req.query.reviewStatus as ReviewStatus | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 10,
      sortBy: (req.query.sortBy as any) || 'score',
      sortDirection: (req.query.sortDirection as any) || 'desc',
    };

    const queueResponse = ReviewWorkflowService.queryReviewQueue(filter);
    res.status(200).json(queueResponse);
  } catch (error: any) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: error.message });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 6. GET /api/hac/config
 * Retrieves active HAC scoring configuration and audit metadata.
 * ----------------------------------------------------------------------------
 */
hacRouter.get('/config', (_req: Request, res: Response) => {
  const config = HacConfigService.getConfig();
  res.status(200).json(config);
});

/**
 * ----------------------------------------------------------------------------
 * 7. PUT /api/hac/config
 * Dynamically updates configuration thresholds, weights, or suppressors.
 * ----------------------------------------------------------------------------
 */
hacRouter.put('/config', (req: Request, res: Response) => {
  try {
    const updated = HacConfigService.updateConfig(req.body);
    res.status(200).json({
      message: 'Configuration successfully updated.',
      config: updated,
    });
  } catch (error: any) {
    res.status(400).json({
      error: 'CONFIG_UPDATE_FAILED',
      message: error.message,
    });
  }
});

/**
 * ----------------------------------------------------------------------------
 * 8. POST /api/hac/claims & POST /api/hac/claims/upload
 * Ingests single or batch claims, validates clinical schema, and adds them to
 * the active review store with dynamic scoring calculation.
 * ----------------------------------------------------------------------------
 */
const handleClaimUpload = (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Handle presets
    if (body.preset) {
      const now = new Date();
      const admIso = new Date(now.getTime() - 4 * 24 * 3600 * 1000).toISOString();
      const disIso = now.toISOString();

      let presetClaim: any;
      if (body.preset === 'uti') {
        presetClaim = {
          patientAge: 68,
          patientGender: 'F',
          admissionDateTime: admIso,
          dischargeDateTime: disIso,
          primaryDiagnosis: {
            code: 'N39.0',
            description: 'Urinary tract infection, site not specified',
            isPrimaryAdmissionDiagnosis: true,
            isSuspectedHacCondition: false,
            firstObservedDateTime: admIso,
          },
          diagnoses: [
            {
              code: 'I50.9',
              description: 'Heart failure, unspecified',
              isPrimaryAdmissionDiagnosis: true,
              isSuspectedHacCondition: false,
              firstObservedDateTime: admIso,
            },
            {
              code: 'T83.511A',
              description: 'Infection and inflammatory reaction due to indwelling urinary catheter',
              isPrimaryAdmissionDiagnosis: false,
              isSuspectedHacCondition: true,
              firstObservedDateTime: new Date(now.getTime() - 24 * 3600 * 1000).toISOString(),
            },
          ],
          procedures: [
            {
              code: '57.94',
              description: 'Insertion of indwelling urinary catheter',
              performedDateTime: new Date(now.getTime() - 90 * 3600 * 1000).toISOString(),
              isPlannedOnAdmission: true,
            },
          ],
        };
      } else if (body.preset === 'fall') {
        presetClaim = {
          patientAge: 79,
          patientGender: 'M',
          admissionDateTime: admIso,
          dischargeDateTime: disIso,
          primaryDiagnosis: {
            code: 'J18.9',
            description: 'Pneumonia, unspecified organism',
            isPrimaryAdmissionDiagnosis: true,
            isSuspectedHacCondition: false,
            firstObservedDateTime: admIso,
          },
          diagnoses: [
            {
              code: 'J18.9',
              description: 'Pneumonia, unspecified organism',
              isPrimaryAdmissionDiagnosis: true,
              isSuspectedHacCondition: false,
              firstObservedDateTime: admIso,
            },
            {
              code: 'S72.001A',
              description: 'Fracture of unspecified part of neck of right femur',
              isPrimaryAdmissionDiagnosis: false,
              isSuspectedHacCondition: true,
              firstObservedDateTime: new Date(now.getTime() - 36 * 3600 * 1000).toISOString(),
            },
          ],
          procedures: [
            {
              code: '79.35',
              description: 'Open reduction of fracture with internal fixation, femur',
              performedDateTime: new Date(now.getTime() - 20 * 3600 * 1000).toISOString(),
              isPlannedOnAdmission: false,
              isRescueIntervention: true,
            },
          ],
        };
      } else {
        // Surgical Site Sepsis
        presetClaim = {
          patientAge: 54,
          patientGender: 'F',
          admissionDateTime: admIso,
          dischargeDateTime: disIso,
          primaryDiagnosis: {
            code: 'K80.00',
            description: 'Calculus of gallbladder with acute cholecystitis',
            isPrimaryAdmissionDiagnosis: true,
            isSuspectedHacCondition: false,
            firstObservedDateTime: admIso,
          },
          diagnoses: [
            {
              code: 'K80.00',
              description: 'Calculus of gallbladder with acute cholecystitis',
              isPrimaryAdmissionDiagnosis: true,
              isSuspectedHacCondition: false,
              firstObservedDateTime: admIso,
            },
            {
              code: 'T81.42XA',
              description: 'Infection following a procedure, deep incisional surgical site',
              isPrimaryAdmissionDiagnosis: false,
              isSuspectedHacCondition: true,
              firstObservedDateTime: new Date(now.getTime() - 48 * 3600 * 1000).toISOString(),
            },
          ],
          procedures: [
            {
              code: '51.23',
              description: 'Laparoscopic cholecystectomy',
              performedDateTime: new Date(now.getTime() - 90 * 3600 * 1000).toISOString(),
              isPlannedOnAdmission: true,
            },
            {
              code: '54.12',
              description: 'Reopening of recent laparotomy site',
              performedDateTime: new Date(now.getTime() - 30 * 3600 * 1000).toISOString(),
              isPlannedOnAdmission: false,
              isReturnToTheatre: true,
            },
          ],
        };
      }

      const claim = ReviewWorkflowService.addClaim(presetClaim);
      const investigation = HacScoringService.calculateInvestigation(claim);
      res.status(201).json({
        message: 'Preset claim ingested successfully.',
        count: 1,
        claims: [claim],
        investigationSummary: {
          claimId: claim.claimId,
          score: investigation.signalResult.score,
          level: investigation.signalResult.level,
        },
      });
      return;
    }

    const itemsToIngest = Array.isArray(body)
      ? body
      : Array.isArray(body.claims)
        ? body.claims
        : [body];

    if (!itemsToIngest || itemsToIngest.length === 0) {
      res.status(400).json({ error: 'EMPTY_PAYLOAD', message: 'No claim data provided to ingest.' });
      return;
    }

    const createdClaims = ReviewWorkflowService.addClaims(itemsToIngest);
    res.status(201).json({
      message: `Successfully ingested ${createdClaims.length} claim(s).`,
      count: createdClaims.length,
      claims: createdClaims,
    });
  } catch (error: any) {
    console.error('[HAC Ingestion Error]', error);
    res.status(500).json({ error: 'INGESTION_FAILED', message: error.message });
  }
};

hacRouter.post('/claims', handleClaimUpload);
hacRouter.post('/claims/upload', handleClaimUpload);

/**
 * ----------------------------------------------------------------------------
 * 9. POST /api/hac/claims/reset
 * Resets claims back to seed dataset for pristine testing and demo consistency.
 * ----------------------------------------------------------------------------
 */
hacRouter.post('/claims/reset', (_req: Request, res: Response) => {
  ReviewWorkflowService.resetToDefaults();
  res.status(200).json({
    message: 'Claims review queue successfully reset to original seed dataset.',
    totalClaims: ReviewWorkflowService.getAllClaims().length,
  });
});

