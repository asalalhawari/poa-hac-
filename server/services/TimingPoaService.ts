/**
 * ============================================================================
 * COMPONENT B EVALUATOR - TIMING & INFERRED PRESENT ON ADMISSION (POA)
 * ============================================================================
 * Evaluates the temporal emergence of the suspected complication relative to
 * admission datetime, distinguishing >=48h, 24-48h, <24h, and missing timestamps.
 *
 * Scoring Bands:
 * - B1: 20 pts -> First appears >= 48 hours after admission (Mid-stay complication)
 * - B2: 12 pts -> First appears between 24 and 48 hours (Intermediate emergence)
 * - B3: 0 pts  -> First appears < 24 hours after admission (Likely Present On Admission)
 * - B_UNKNOWN: 0 pts -> Missing timestamps; flagged for manual chart verification
 */

import { ComponentBBand, ComponentBScore, DiagnosisEntry, HacConfigDTO } from '../contracts/hac.types.js';

export class TimingPoaService {
  /**
   * Evaluates POA timing inference from admission timestamp and diagnosis appearance timestamp.
   */
  public static evaluate(
    admissionDateTime: string,
    targetDiagnosis: DiagnosisEntry | undefined,
    config: HacConfigDTO
  ): ComponentBScore {
    const maxPoints = config.componentWeights.maxB;
    const midStayThreshold = config.thresholds.midStayThresholdHours;
    const earlyWindow = config.thresholds.earlyWindowHours;

    // Guard: Missing admission timestamp
    if (!admissionDateTime || isNaN(new Date(admissionDateTime).getTime())) {
      return {
        component: 'B',
        title: 'New mid-stay indication (Timing / Inferred POA)',
        band: 'B_UNKNOWN',
        bandLabel: 'Missing admission timestamp',
        admissionDateTime: admissionDateTime || 'NOT_PROVIDED',
        firstObservedDateTime: null,
        elapsedHoursFromAdmission: null,
        thresholdHours: midStayThreshold,
        earlyWindowHours: earlyWindow,
        points: 0,
        maxPoints,
        timingInferred: false,
        reasoning: 'Admission timestamp is missing or malformed. Timing cannot be established automatically.',
      };
    }

    // Guard: Missing diagnosis or firstObservedDateTime
    if (!targetDiagnosis || !targetDiagnosis.firstObservedDateTime || isNaN(new Date(targetDiagnosis.firstObservedDateTime).getTime())) {
      return {
        component: 'B',
        title: 'New mid-stay indication (Timing / Inferred POA)',
        band: 'B_UNKNOWN',
        bandLabel: 'Missing observation timestamp',
        admissionDateTime,
        firstObservedDateTime: targetDiagnosis?.firstObservedDateTime ?? null,
        elapsedHoursFromAdmission: null,
        thresholdHours: midStayThreshold,
        earlyWindowHours: earlyWindow,
        points: 0,
        maxPoints,
        timingInferred: false,
        reasoning: 'First observation timestamp for the complication diagnosis is missing from claim service lines.',
      };
    }

    const admMs = new Date(admissionDateTime).getTime();
    const obsMs = new Date(targetDiagnosis.firstObservedDateTime).getTime();
    const diffMs = obsMs - admMs;
    const elapsedHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;

    // Negative elapsed hours (e.g. observation recorded before admission)
    if (elapsedHours < 0) {
      return {
        component: 'B',
        title: 'New mid-stay indication (Timing / Inferred POA)',
        band: 'B3',
        bandLabel: 'Pre-admission onset (< 0h)',
        admissionDateTime,
        firstObservedDateTime: targetDiagnosis.firstObservedDateTime,
        elapsedHoursFromAdmission: elapsedHours,
        thresholdHours: midStayThreshold,
        earlyWindowHours: earlyWindow,
        points: 0,
        maxPoints,
        timingInferred: true,
        reasoning: `Condition was documented ${Math.abs(elapsedHours)} hours prior to admission timestamp (Likely pre-existing / POA).`,
      };
    }

    // Case 1: First observed >= 48 hours (midStayThresholdHours)
    if (elapsedHours >= midStayThreshold) {
      return {
        component: 'B',
        title: 'New mid-stay indication (Timing / Inferred POA)',
        band: 'B1',
        bandLabel: `First appears ≥${midStayThreshold}h after admission`,
        admissionDateTime,
        firstObservedDateTime: targetDiagnosis.firstObservedDateTime,
        elapsedHoursFromAdmission: elapsedHours,
        thresholdHours: midStayThreshold,
        earlyWindowHours: earlyWindow,
        points: maxPoints, // 20 pts
        maxPoints,
        timingInferred: true,
        reasoning: `The diagnosis was not present on admission-day claim lines and first appeared at ${elapsedHours} hours after admission (exceeding the ${midStayThreshold}-hour mid-stay threshold).`,
      };
    }

    // Case 2: First observed between 24h and 48h
    if (elapsedHours >= earlyWindow) {
      const intermediatePoints = Math.round(maxPoints * 0.6); // 12 pts
      return {
        component: 'B',
        title: 'New mid-stay indication (Timing / Inferred POA)',
        band: 'B2',
        bandLabel: `First appears between ${earlyWindow}h and ${midStayThreshold}h`,
        admissionDateTime,
        firstObservedDateTime: targetDiagnosis.firstObservedDateTime,
        elapsedHoursFromAdmission: elapsedHours,
        thresholdHours: midStayThreshold,
        earlyWindowHours: earlyWindow,
        points: intermediatePoints,
        maxPoints,
        timingInferred: true,
        reasoning: `Diagnosis first appeared at ${elapsedHours} hours after admission (within the ${earlyWindow}-${midStayThreshold}h post-admission window).`,
      };
    }

    // Case 3: First observed < 24h (Likely POA)
    return {
      component: 'B',
      title: 'New mid-stay indication (Timing / Inferred POA)',
      band: 'B3',
      bandLabel: `First appears <${earlyWindow}h (Early stay / POA)`,
      admissionDateTime,
      firstObservedDateTime: targetDiagnosis.firstObservedDateTime,
      elapsedHoursFromAdmission: elapsedHours,
      thresholdHours: midStayThreshold,
      earlyWindowHours: earlyWindow,
      points: 0,
      maxPoints,
      timingInferred: true,
      reasoning: `Diagnosis appeared early at ${elapsedHours} hours from admission (within the initial ${earlyWindow}h window, suggesting Present On Admission).`,
    };
  }
}
