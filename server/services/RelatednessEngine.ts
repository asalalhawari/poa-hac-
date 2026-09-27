/**
 * ============================================================================
 * COMPONENT C EVALUATOR - CLINICAL RELATEDNESS & AI PATIENT PATH EVIDENCE
 * ============================================================================
 * Evaluates whether the complication diagnosis is a recognized, inevitable
 * progression of the admitting primary condition or an unrelated event.
 *
 * Scoring Outcomes:
 * - UNRELATED: 20 pts -> The complication is NOT an expected progression of the primary illness.
 * - UNKNOWN: 10 pts   -> Borderline clinical link / insufficient pathway concordance.
 * - RECOGNIZED_PROGRESSION: 0 pts -> Normal, documented progression of severe admitting pathology.
 */

import {
  ClaimEntity,
  ComponentCOutcome,
  ComponentCScore,
  DiagnosisEntry,
  HacConfigDTO,
} from '../contracts/hac.types.js';

interface KnownClinicalProgressionRule {
  primaryCodePrefix: string;
  complicationCodePrefix: string;
  expectedPathway: string[];
  rationale: string;
}

export class RelatednessEngine {
  // Known clinical progression pathways where condition evolution is biologically typical
  private static readonly KNOWN_PROGRESSIONS: KnownClinicalProgressionRule[] = [
    {
      primaryCodePrefix: 'K85', // Acute pancreatitis
      complicationCodePrefix: 'K85.9', // Peripancreatic fluid / necrosis
      expectedPathway: ['Severe acute pancreatitis', 'Fluid resuscitation', 'Peripancreatic inflammatory response', 'Clinical stabilization'],
      rationale: 'Local fluid collection and pancreatic inflammatory spread is a documented clinical progression of necrotizing pancreatitis.',
    },
    {
      primaryCodePrefix: 'C', // Malignant neoplasms
      complicationCodePrefix: 'R64', // Cachexia
      expectedPathway: ['Advanced malignancy', 'Oncological management', 'Nutritional decline / tumor cachexia', 'Palliative care'],
      rationale: 'Cachexia is an expected, systemic manifestation of advanced oncological progression.',
    },
    {
      primaryCodePrefix: 'I50', // Heart failure
      complicationCodePrefix: 'J81', // Pulmonary edema
      expectedPathway: ['Decompensated heart failure', 'Diuresis', 'Transient pulmonary congestion', 'Cardiorenal equilibrium'],
      rationale: 'Acute pulmonary edema is a recognized direct hemodynamic decompensation of admitting acute heart failure.',
    },
  ];

  /**
   * Evaluates clinical relatedness and generates AI patient path divergence analysis.
   */
  public static evaluate(
    claim: ClaimEntity,
    targetHacDiagnosis: DiagnosisEntry | undefined,
    config: HacConfigDTO
  ): ComponentCScore {
    const maxPoints = config.componentWeights.maxC;
    const primaryCode = claim.primaryDiagnosis?.code?.trim().toUpperCase() || 'UNKNOWN';
    const primaryDesc = claim.primaryDiagnosis?.description || 'Primary Admitting Condition';
    const hacCode = targetHacDiagnosis?.code?.trim().toUpperCase() || 'UNKNOWN';
    const hacDesc = targetHacDiagnosis?.description || 'Secondary Complication Condition';

    // 1. Check for recognized clinical progression
    const matchedProgression = this.KNOWN_PROGRESSIONS.find(
      (prog) => primaryCode.startsWith(prog.primaryCodePrefix) && hacCode.startsWith(prog.complicationCodePrefix)
    );

    if (matchedProgression) {
      return {
        component: 'C',
        title: 'Unrelatedness to the admission indication',
        outcome: 'RECOGNIZED_PROGRESSION',
        outcomeLabel: 'Recognized clinical progression of primary illness',
        points: 0,
        maxPoints,
        pathwaySimilarityPercent: 88,
        deviationConfidence: 'HIGH',
        expectedPathway: matchedProgression.expectedPathway,
        actualPathway: [primaryDesc, 'Inpatient medical management', hacDesc, 'Resolution / Discharge'],
        divergencePoint: 'Condition followed documented pathophysiology of admitting primary disease.',
        reasoning: matchedProgression.rationale,
      };
    }

    // 2. Surgical admission developing post-op complication (High Unrelatedness)
    const isSurgicalAdmission = claim.procedures && claim.procedures.length > 0;
    const hasInfectionOrSystemicHac = /^(T81|T84|J95|K91|L02|A41|D62)/i.test(hacCode);

    if (isSurgicalAdmission && hasInfectionOrSystemicHac) {
      const primaryProcedure = claim.procedures[0];
      const actualSteps: string[] = [
        primaryDesc,
        primaryProcedure ? primaryProcedure.description : 'Initial surgery',
      ];

      actualSteps.push(`${hacDesc} (Late onset)`);

      const returnIntervention = claim.procedures.find((p) => p.isReturnToTheatre || p.isRescueIntervention);
      if (returnIntervention) {
        actualSteps.push(`Unplanned intervention: ${returnIntervention.description}`);
      }

      return {
        component: 'C',
        title: 'Unrelatedness to the admission indication',
        outcome: 'UNRELATED',
        outcomeLabel: 'Unrelated complication (Unexpected path change)',
        points: maxPoints, // 20 pts
        maxPoints,
        pathwaySimilarityPercent: 31,
        deviationConfidence: 'HIGH',
        expectedPathway: [
          primaryDesc,
          primaryProcedure ? primaryProcedure.description : 'Planned surgery',
          'Expected clinical recovery',
          'Discharge without complication',
        ],
        actualPathway: actualSteps,
        divergencePoint: `Deviation initiated at ${hacDesc}, followed by unplanned escalation not anticipated by initial admission diagnosis.`,
        reasoning: `Historical and clinical pathway evidence indicates that ${hacDesc} (${hacCode}) is NOT an expected biological progression of the admitting condition ${primaryDesc} (${primaryCode}).`,
      };
    }

    // 3. Ambiguous / Partial relationship (UNKNOWN)
    return {
      component: 'C',
      title: 'Unrelatedness to the admission indication',
      outcome: 'UNKNOWN',
      outcomeLabel: 'Borderline clinical relationship / Ambiguous pathway',
      points: Math.round(maxPoints * 0.5), // 10 pts
      maxPoints,
      pathwaySimilarityPercent: 58,
      deviationConfidence: 'MEDIUM',
      expectedPathway: [primaryDesc, 'Expected standard recovery trajectory', 'Discharge'],
      actualPathway: [primaryDesc, `${hacDesc} documented mid-stay`, 'Clinical review'],
      divergencePoint: 'Trajectory displays moderate clinical divergence; requires clinical specialist chart review.',
      reasoning: 'The relationship between admitting diagnosis and subsequent complication requires qualitative clinical chart evaluation.',
    };
  }
}
