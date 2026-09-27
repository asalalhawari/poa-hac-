/**
 * ============================================================================
 * HAC BACKEND SERVICE - AUTOMATED TEST SUITE
 * ============================================================================
 * Tests scoring rules, timing inference, intervention ceilings, clinical
 * relatedness, history lookbacks, data quality handling, and review workflows.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import { HacConfigService } from '../config/hacConfig.js';
import { ClaimEntity } from '../contracts/hac.types.js';
import { INITIAL_SEED_CLAIMS } from '../data/seedClaims.js';
import { ComponentAService } from '../services/ComponentAService.js';
import { DataQualityValidator } from '../services/DataQualityValidator.js';
import { HacScoringService } from '../services/HacScoringService.js';
import { InterventionClassifier } from '../services/InterventionClassifier.js';
import { ProviderHistoryService } from '../services/ProviderHistoryService.js';
import { RelatednessEngine } from '../services/RelatednessEngine.js';
import { ReviewWorkflowService } from '../services/ReviewWorkflowService.js';
import { TimingPoaService } from '../services/TimingPoaService.js';

test('HAC Backend Service Test Suite', async (t) => {
  // Reset config before tests
  HacConfigService.resetToDefaults();
  const config = HacConfigService.getConfig();

  await t.test('1. Classic HAC Investigation (CLM-2024-001) Calculation', () => {
    const claim = INITIAL_SEED_CLAIMS.find((c) => c.claimId === 'CLM-2024-001')!;
    assert.ok(claim, 'CLM-2024-001 should exist');

    const result = HacScoringService.calculateInvestigation(claim);

    // Verify Invariant: Never auto-denies, always HUMAN_REVIEW
    assert.equal(result.signalResult.action, 'HUMAN_REVIEW');

    // Verify Score & Level
    // Component A: L02.211 (A3: 12 pts)
    // Component B: 74h (B1: 20 pts)
    // Component C: Unrelated abscess after appendicitis (C1: 20 pts)
    // Component D: Return to theatre incision & drainage (D1: 25 pts)
    // Component E: Clean 90-day history (E4: 0 pts)
    // Total = 12 + 20 + 20 + 25 + 0 = 77
    assert.equal(result.signalResult.score, 77);
    assert.equal(result.signalResult.level, 'HIGH');

    // Verify UI Findings Cards
    assert.equal(result.findingsCards.length, 5);
    const timingCard = result.findingsCards.find((c) => c.key === 'timing');
    assert.ok(timingCard);
    assert.equal(timingCard.points, 20);
    assert.equal(timingCard.headline, 'First detected 74.1 hours after admission');

    // Verify Technical Breakdown Rows
    assert.equal(result.technicalBreakdown.rows.length, 5);
    assert.equal(result.technicalBreakdown.componentA.band, 'A3');
    assert.equal(result.technicalBreakdown.componentB.band, 'B1');
    assert.equal(result.technicalBreakdown.componentC.outcome, 'UNRELATED');
    assert.equal(result.technicalBreakdown.componentD.category, 'RETURN_TO_THEATRE');
    assert.equal(result.technicalBreakdown.componentE.outcome, 'NOTHING_FOUND');

    // Verify Audit Metadata
    assert.ok(result.audit.calculationHash);
    assert.equal(result.audit.modelVersion, 'hac-ai-path-v2.4');
    assert.equal(result.audit.rulesVersion, 'poa-hac-ruleset-v3.1.0');
    assert.ok(result.audit.calculatedAt);
  });

  await t.test('2. Component B: Timing & POA Inference Evaluation', () => {
    const admissionTime = '2024-01-01T08:00:00Z';

    // >= 48h -> Band B1 (20 pts)
    const lateDiag = {
      code: 'L02.211',
      description: 'Abscess',
      isPrimaryAdmissionDiagnosis: false,
      isSuspectedHacCondition: true,
      firstObservedDateTime: '2024-01-03T10:00:00Z', // 50 hours
    };
    const lateScore = TimingPoaService.evaluate(admissionTime, lateDiag, config);
    assert.equal(lateScore.band, 'B1');
    assert.equal(lateScore.points, 20);
    assert.equal(lateScore.elapsedHoursFromAdmission, 50);

    // 24 - 48h -> Band B2 (12 pts)
    const midDiag = {
      code: 'L02.211',
      description: 'Abscess',
      isPrimaryAdmissionDiagnosis: false,
      isSuspectedHacCondition: true,
      firstObservedDateTime: '2024-01-02T14:00:00Z', // 30 hours
    };
    const midScore = TimingPoaService.evaluate(admissionTime, midDiag, config);
    assert.equal(midScore.band, 'B2');
    assert.equal(midScore.points, 12);
    assert.equal(midScore.elapsedHoursFromAdmission, 30);

    // < 24h -> Band B3 (0 pts, POA)
    const earlyDiag = {
      code: 'L02.211',
      description: 'Abscess',
      isPrimaryAdmissionDiagnosis: false,
      isSuspectedHacCondition: true,
      firstObservedDateTime: '2024-01-01T14:00:00Z', // 6 hours
    };
    const earlyScore = TimingPoaService.evaluate(admissionTime, earlyDiag, config);
    assert.equal(earlyScore.band, 'B3');
    assert.equal(earlyScore.points, 0);

    // Missing observation datetime -> Band B_UNKNOWN (0 pts + fallback)
    const missingTimeDiag = {
      code: 'L02.211',
      description: 'Abscess',
      isPrimaryAdmissionDiagnosis: false,
      isSuspectedHacCondition: true,
    };
    const missingScore = TimingPoaService.evaluate(admissionTime, missingTimeDiag, config);
    assert.equal(missingScore.band, 'B_UNKNOWN');
    assert.equal(missingScore.points, 0);
    assert.equal(missingScore.timingInferred, false);
  });

  await t.test('3. Component D: Intervention Modifier 25-Point Ceiling Enforcement', () => {
    const claimWithMultipleInterventions: ClaimEntity = {
      ...INITIAL_SEED_CLAIMS[0],
      procedures: [
        {
          code: '54.0',
          description: 'Incision and drainage of abdominal wall abscess',
          isPlannedOnAdmission: false,
          isReturnToTheatre: true, // 25 pts
        },
        {
          code: '96.71',
          description: 'Continuous mechanical ventilation',
          isPlannedOnAdmission: false,
          isRescueIntervention: true, // 20 pts
        },
      ],
    };

    const compD = InterventionClassifier.evaluate(claimWithMultipleInterventions, config);
    // Strict Invariant: Cannot exceed 25
    assert.ok(compD.points <= 25, 'Component D score must not exceed 25 points');
    assert.equal(compD.points, 25);
    assert.equal(compD.category, 'RETURN_TO_THEATRE');
  });

  await t.test('4. Component C: Recognized Clinical Progression Returns 0 Points', () => {
    const pancreatitisClaim = INITIAL_SEED_CLAIMS.find((c) => c.claimId === 'CLM-2024-007')!;
    const compC = RelatednessEngine.evaluate(
      pancreatitisClaim,
      pancreatitisClaim.diagnoses[1],
      config
    );

    assert.equal(compC.outcome, 'RECOGNIZED_PROGRESSION');
    assert.equal(compC.points, 0);
    assert.ok(compC.pathwaySimilarityPercent > 70);
  });

  await t.test('5. Component E: Historical Readmission Linkage within 30 Days', () => {
    const readmissionClaim = INITIAL_SEED_CLAIMS.find((c) => c.claimId === 'CLM-2024-008')!;
    const compE = ProviderHistoryService.evaluate(readmissionClaim, config);

    assert.equal(compE.outcome, 'DIRECT_30D');
    assert.equal(compE.points, 15);
    assert.equal(compE.linkedPriorDays, 14);
  });

  await t.test('6. Suppressor Logic: Palliative Care Protocol Zeroes Score', () => {
    const palliativeClaim = INITIAL_SEED_CLAIMS.find((c) => c.claimId === 'CLM-2024-009')!;
    const result = HacScoringService.calculateInvestigation(palliativeClaim);

    assert.equal(result.signalResult.score, 0);
    assert.equal(result.signalResult.level, 'NONE');
    assert.equal(result.suppressors.applied.length, 1);
    assert.equal(result.suppressors.applied[0].suppressorId, 'SUPPRESSOR_PALLIATIVE_CARE');
  });

  await t.test('7. Data Quality Validation Identifies Missing Timestamps and History', () => {
    const dqClaim = INITIAL_SEED_CLAIMS.find((c) => c.claimId === 'CLM-2024-006')!;
    const dq = DataQualityValidator.validate(dqClaim);

    assert.equal(dq.overallStatus, 'PARTIAL');
    const missingTimeFlag = dq.flags.find((f) => f.code === 'DQ_WARN_MISSING_DIAGNOSIS_TIME');
    assert.ok(missingTimeFlag, 'Should flag missing diagnosis observation datetime');

    const historyFlag = dq.flags.find((f) => f.code === 'DQ_INFO_HISTORY_UNAVAILABLE');
    assert.ok(historyFlag, 'Should flag unavailable longitudinal history');
  });

  await t.test('8. Review Workflow: Clinical Notes and Human Decision Registration', () => {
    const testClaimId = 'CLM-2024-002';

    // Add note
    const note = ReviewWorkflowService.addNote(testClaimId, {
      author: 'Dr. Faisal',
      authorRole: 'Surgical Auditor',
      content: 'Chest tube placement reviewed. Documented as postprocedural pneumothorax.',
    });
    assert.ok(note.id);
    assert.equal(note.claimId, testClaimId);

    const notes = ReviewWorkflowService.getNotes(testClaimId);
    assert.ok(notes.some((n) => n.content.includes('Chest tube')));

    // Submit Decision
    const decision = ReviewWorkflowService.submitDecision(testClaimId, {
      outcome: 'CONFIRM_CONCERN',
      rationale: 'Iatrogenic pneumothorax confirmed after central line insertion.',
      reviewerId: 'DR-FAISAL-01',
    });
    assert.equal(decision.outcome, 'CONFIRM_CONCERN');
    assert.equal(decision.newStatus, 'CONFIRMED');

    // Confirm claim status was updated in store
    const updatedClaim = ReviewWorkflowService.getClaim(testClaimId)!;
    assert.equal(updatedClaim.reviewStatus, 'CONFIRMED');
  });

  await t.test('9. Review Queue Query, Filtering, and Pagination', () => {
    const queue = ReviewWorkflowService.queryReviewQueue({
      page: 1,
      pageSize: 5,
      sortBy: 'score',
      sortDirection: 'desc',
    });

    assert.equal(queue.items.length, 5);
    assert.ok(queue.pagination.total >= 9);
    assert.ok(queue.summaryCounts.total >= 9);

    // Verify sort by score descending
    for (let i = 0; i < queue.items.length - 1; i++) {
      assert.ok(
        queue.items[i].score >= queue.items[i + 1].score,
        `Queue items should be ordered by score descending: ${queue.items[i].score} >= ${queue.items[i + 1].score}`
      );
    }

    // Filter by signalLevel HIGH
    const highQueue = ReviewWorkflowService.queryReviewQueue({
      signalLevel: 'HIGH',
    });
    assert.ok(highQueue.items.every((i) => i.signalLevel === 'HIGH'));
  });

  await t.test('10. Configurability: Dynamic Updating of Mid-Stay Threshold', () => {
    // Change threshold from 48h to 72h
    HacConfigService.updateConfig({
      thresholds: {
        midStayThresholdHours: 72,
        earlyWindowHours: 24,
        historyLookbackDays: 90,
        interventionScoreCap: 25,
      },
    });

    const admissionTime = '2024-01-01T08:00:00Z';
    const diagAt50h = {
      code: 'L02.211',
      description: 'Abscess',
      isPrimaryAdmissionDiagnosis: false,
      isSuspectedHacCondition: true,
      firstObservedDateTime: '2024-01-03T10:00:00Z', // 50h
    };

    // Under 72h threshold, 50h is in B2 (24-72h) instead of B1 (>=48h)
    const evaluated = TimingPoaService.evaluate(
      admissionTime,
      diagAt50h,
      HacConfigService.getConfig()
    );
    assert.equal(evaluated.band, 'B2');
    assert.equal(evaluated.thresholdHours, 72);

    // Reset to defaults
    HacConfigService.resetToDefaults();
  });

  await t.test('11. Ingestion: enrichClaim and addClaims Batch Workflow', () => {
    const rawPartial = {
      patientAge: 62,
      primaryDiagnosis: {
        code: 'K80.00',
        description: 'Cholecystitis',
        isPrimaryAdmissionDiagnosis: true,
        isSuspectedHacCondition: false,
      },
    };

    const enriched = ReviewWorkflowService.enrichClaim(rawPartial);
    assert.ok(enriched.claimId.startsWith('CLM-2024-'));
    assert.ok(enriched.patientId.startsWith('P-'));
    assert.equal(enriched.reviewStatus, 'NEW');
    assert.equal(enriched.lengthOfStayDays, 5);
    assert.equal(enriched.diagnoses.length, 2);
    assert.equal(enriched.procedures.length, 1);

    const added = ReviewWorkflowService.addClaim(rawPartial);
    assert.ok(ReviewWorkflowService.getClaim(added.claimId));

    // Reset store
    ReviewWorkflowService.resetToDefaults();
    assert.equal(ReviewWorkflowService.getClaim(added.claimId), undefined);
  });
});

