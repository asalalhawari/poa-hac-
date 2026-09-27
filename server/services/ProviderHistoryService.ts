/**
 * ============================================================================
 * COMPONENT E EVALUATOR - PREVIOUS PROVIDER & PROCEDURE LINKAGE
 * ============================================================================
 * Evaluates whether a complication presenting on admission or early in the stay
 * links back to a recent surgical procedure or hospitalization at the same or
 * affiliated provider within the configurable lookback window.
 *
 * Scoring Outcomes:
 * - DIRECT_30D: 15 pts -> Related procedure at provider within 30 days
 * - LINKED_90D: 10 pts -> Linked procedure/intervention within 31-90 days
 * - CHRONIC_EPISODE: 5 pts -> Linked chronic care episode at same provider
 * - NOTHING_FOUND: 0 pts -> Lookback searched; no prior related event found
 * - UNAVAILABLE: 0 pts -> Longitudinal history unavailable; marked for audit
 */

import {
  ClaimEntity,
  ComponentEOutcome,
  ComponentEScore,
  HacConfigDTO,
} from '../contracts/hac.types.js';

export class ProviderHistoryService {
  /**
   * Evaluates patient historical claims across the configured lookback window.
   */
  public static evaluate(claim: ClaimEntity, config: HacConfigDTO): ComponentEScore {
    const lookbackDays = config.thresholds.historyLookbackDays;
    const maxPoints = config.componentWeights.maxE;

    // Guard: Patient longitudinal history was not searchable or unavailable
    if (!claim.isPatientHistoryAvailable) {
      return {
        component: 'E',
        title: 'Provider linkage (Historical readmission / Complication lookback)',
        outcome: 'UNAVAILABLE',
        outcomeLabel: 'Member history unavailable',
        lookbackDaysSearched: lookbackDays,
        historyAvailable: false,
        points: 0,
        maxPoints,
        reasoning: `Longitudinal history for the patient was unavailable during scoring. Absence of prior procedure cannot be confirmed; flagged for manual review.`,
      };
    }

    const history = claim.patientHistory || [];
    const validHistoryInWindow = history.filter(
      (h) => h.daysPriorToAdmission <= lookbackDays && h.daysPriorToAdmission >= 0
    );

    // Look for related procedures in 0-30 day window
    const recent30Day = validHistoryInWindow.find(
      (h) => h.isRelatedToCurrentCondition && h.daysPriorToAdmission <= 30 && h.procedureCode
    );

    if (recent30Day) {
      return {
        component: 'E',
        title: 'Provider linkage (Historical readmission / Complication lookback)',
        outcome: 'DIRECT_30D',
        outcomeLabel: 'Direct procedure linkage within 30 days',
        lookbackDaysSearched: lookbackDays,
        historyAvailable: true,
        linkedPriorClaimId: recent30Day.claimId,
        linkedPriorProcedure: `${recent30Day.procedureDescription || recent30Day.procedureCode} (${recent30Day.daysPriorToAdmission}d prior)`,
        linkedPriorDays: recent30Day.daysPriorToAdmission,
        points: Math.min(15, maxPoints),
        maxPoints,
        reasoning: `Identified related surgical procedure ${recent30Day.procedureCode} performed ${recent30Day.daysPriorToAdmission} days prior to this admission at facility ${recent30Day.facilityCode}.`,
      };
    }

    // Look for related procedures in 31-90 day window
    const linked90Day = validHistoryInWindow.find(
      (h) => h.isRelatedToCurrentCondition && h.daysPriorToAdmission > 30 && h.daysPriorToAdmission <= lookbackDays
    );

    if (linked90Day) {
      return {
        component: 'E',
        title: 'Provider linkage (Historical readmission / Complication lookback)',
        outcome: 'LINKED_90D',
        outcomeLabel: 'Linked procedure within 31-90 day lookback',
        lookbackDaysSearched: lookbackDays,
        historyAvailable: true,
        linkedPriorClaimId: linked90Day.claimId,
        linkedPriorProcedure: `${linked90Day.procedureDescription || linked90Day.procedureCode} (${linked90Day.daysPriorToAdmission}d prior)`,
        linkedPriorDays: linked90Day.daysPriorToAdmission,
        points: Math.min(10, maxPoints),
        maxPoints,
        reasoning: `Identified related intervention ${linked90Day.procedureCode} performed ${linked90Day.daysPriorToAdmission} days prior in the ${lookbackDays}-day lookback window.`,
      };
    }

    // Look for related non-surgical episode at same provider
    const sameFacilityEpisode = validHistoryInWindow.find(
      (h) => h.providerId === claim.providerId && h.isRelatedToCurrentCondition
    );

    if (sameFacilityEpisode) {
      return {
        component: 'E',
        title: 'Provider linkage (Historical readmission / Complication lookback)',
        outcome: 'CHRONIC_EPISODE',
        outcomeLabel: 'Related care episode at same facility',
        lookbackDaysSearched: lookbackDays,
        historyAvailable: true,
        linkedPriorClaimId: sameFacilityEpisode.claimId,
        linkedPriorDays: sameFacilityEpisode.daysPriorToAdmission,
        points: Math.min(5, maxPoints),
        maxPoints,
        reasoning: `Patient had related clinical care at provider ${sameFacilityEpisode.facilityCode} ${sameFacilityEpisode.daysPriorToAdmission} days prior to admission.`,
      };
    }

    // 0 points: Lookback was searched, and clean / no prior related procedure found
    return {
      component: 'E',
      title: 'Provider linkage (Historical readmission / Complication lookback)',
      outcome: 'NOTHING_FOUND',
      outcomeLabel: 'No relevant earlier procedure found in lookback window',
      lookbackDaysSearched: lookbackDays,
      historyAvailable: true,
      points: 0,
      maxPoints,
      reasoning: `The available ${lookbackDays}-day longitudinal claims history was thoroughly evaluated. No earlier procedure relevant to this complication was identified.`,
    };
  }
}
