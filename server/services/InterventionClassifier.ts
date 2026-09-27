/**
 * ============================================================================
 * COMPONENT D EVALUATOR - UNPLANNED INTERVENTION LADDER & CEILING
 * ============================================================================
 * Classifies secondary procedures, rescue interventions, and escalations
 * triggered by the complication.
 *
 * Ladder Hierarchy:
 * - Return to Theatre (unplanned second surgery in same anatomical system): 25 pts
 * - High Acuity Rescue (ICU escalation, mechanical ventilation, resuscitation): 20 pts
 * - Unplanned Operation: 14 pts
 * - Diagnostic Imaging / Endoscopy: 8 pts
 * - None / Standard medical care: 0 pts
 *
 * Strict Architectural Rule:
 * Combined modifier points are capped at the configured ceiling (25 points).
 */

import {
  ClaimEntity,
  ComponentDCategory,
  ComponentDScore,
  HacConfigDTO,
  ProcedureEntry,
} from '../contracts/hac.types.js';

export class InterventionClassifier {
  /**
   * Evaluates procedural escalations and enforces the 25-point ceiling.
   */
  public static evaluate(claim: ClaimEntity, config: HacConfigDTO): ComponentDScore {
    const maxCap = config.thresholds.interventionScoreCap; // default 25
    const maxComponentPoints = config.componentWeights.maxD; // default 25

    const procedures = claim.procedures || [];

    // Find any unplanned return to theatre
    const returnToTheatreProc = procedures.find(
      (p) => p.isReturnToTheatre || /revision|drainage|debridement|reoperation|re-exploration/i.test(p.description)
    );

    if (returnToTheatreProc) {
      const rawPoints = 25;
      const points = Math.min(rawPoints, maxCap, maxComponentPoints);
      return {
        component: 'D',
        title: 'Unplanned intervention triggered',
        category: 'RETURN_TO_THEATRE',
        categoryLabel: 'Unplanned return to theatre / surgical revision',
        triggerProcedureCode: returnToTheatreProc.code,
        triggerProcedureDescription: returnToTheatreProc.description,
        rawModifierPoints: rawPoints,
        points,
        maxPoints: maxComponentPoints,
        isCeilingApplied: rawPoints > points,
        reasoning: `Patient returned to theatre for unplanned procedure: ${returnToTheatreProc.description} (${returnToTheatreProc.code}).`,
      };
    }

    // Find any high acuity rescue or ICU transfer
    const rescueProc = procedures.find((p) => p.isRescueIntervention || /intubation|ventilat|resuscitat|icu/i.test(p.description));
    if (rescueProc) {
      const rawPoints = 20;
      const points = Math.min(rawPoints, maxCap, maxComponentPoints);
      return {
        component: 'D',
        title: 'Unplanned intervention triggered',
        category: 'HIGH_ACUITY_RESCUE',
        categoryLabel: 'High acuity clinical rescue / critical care escalation',
        triggerProcedureCode: rescueProc.code,
        triggerProcedureDescription: rescueProc.description,
        rawModifierPoints: rawPoints,
        points,
        maxPoints: maxComponentPoints,
        isCeilingApplied: rawPoints > points,
        reasoning: `High-acuity rescue intervention was triggered: ${rescueProc.description} (${rescueProc.code}).`,
      };
    }

    // Find unplanned operation (not flagged on initial admission)
    const unplannedProc = procedures.find((p) => !p.isPlannedOnAdmission);
    if (unplannedProc) {
      const rawPoints = 14;
      const points = Math.min(rawPoints, maxCap, maxComponentPoints);
      return {
        component: 'D',
        title: 'Unplanned intervention triggered',
        category: 'UNPLANNED_OPERATION',
        categoryLabel: 'Unplanned secondary operation',
        triggerProcedureCode: unplannedProc.code,
        triggerProcedureDescription: unplannedProc.description,
        rawModifierPoints: rawPoints,
        points,
        maxPoints: maxComponentPoints,
        isCeilingApplied: rawPoints > points,
        reasoning: `An unplanned operative procedure occurred during the stay: ${unplannedProc.description} (${unplannedProc.code}).`,
      };
    }

    // Check for diagnostic imaging / endoscopy
    const diagnosticProc = procedures.find((p) => /ct|mri|ultrasound|endoscop|bronchoscop|biopsy/i.test(p.description));
    if (diagnosticProc) {
      const rawPoints = 8;
      const points = Math.min(rawPoints, maxCap, maxComponentPoints);
      return {
        component: 'D',
        title: 'Unplanned intervention triggered',
        category: 'IMAGING_OR_ENDOSCOPY',
        categoryLabel: 'Diagnostic imaging or endoscopic evaluation only',
        triggerProcedureCode: diagnosticProc.code,
        triggerProcedureDescription: diagnosticProc.description,
        rawModifierPoints: rawPoints,
        points,
        maxPoints: maxComponentPoints,
        isCeilingApplied: rawPoints > points,
        reasoning: `Diagnostic imaging / endoscopy was ordered in response to clinical status: ${diagnosticProc.description}.`,
      };
    }

    // No intervention triggered
    return {
      component: 'D',
      title: 'Unplanned intervention triggered',
      category: 'NONE',
      categoryLabel: 'No triggered operative or invasive intervention',
      rawModifierPoints: 0,
      points: 0,
      maxPoints: maxComponentPoints,
      isCeilingApplied: false,
      reasoning: 'Stay was managed medically with no unplanned operative, rescue, or advanced diagnostic interventions.',
    };
  }
}
