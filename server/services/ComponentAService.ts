/**
 * ============================================================================
 * COMPONENT A EVALUATOR - CAUSE TRANSPARENCY OF THE DIAGNOSIS
 * ============================================================================
 * Evaluates what the diagnosis code's own descriptor admits about its cause.
 *
 * Scoring Bands:
 * - A1: 20 pts -> Descriptor explicitly names a care event (surgical infection, post-op complication)
 * - A2: 16 pts -> Descriptor explicitly names a device or drug (prosthesis infection, catheter complication)
 * - A3: 12 pts -> Cause-neutral stand-in for a complication code (e.g. abscess at surgical site)
 * - A4: 10 pts -> An injury/acute deficit which requires an external event (e.g. posthemorrhagic anemia)
 * - A5: 6 pts  -> Present on a complication list, but silent on cause (e.g. hospital-acquired delirium, AKI)
 * - A6: 0 pts  -> Everything else / standard disease presentation
 */

import { ComponentABand, ComponentAScore, DiagnosisEntry, HacConfigDTO } from '../contracts/hac.types.js';

interface CodeDescriptorRule {
  pattern: RegExp;
  band: ComponentABand;
  points: number;
  label: string;
  reasoning: string;
}

export class ComponentAService {
  private static readonly RULES: CodeDescriptorRule[] = [
    // A1: Explicitly names a care event
    {
      pattern: /^(T81\.4|J95\.|K91\.|I97\.|N99\.|G97\.|E89\.|H59\.|H95\.)/i,
      band: 'A1',
      points: 20,
      label: 'The descriptor explicitly names a care event',
      reasoning: 'The ICD-10 descriptor explicitly attributes the diagnosis to a post-procedural complication or care event.',
    },
    // A2: Explicitly names a device, implant, graft, or drug
    {
      pattern: /^(T82\.|T83\.|T84\.|T85\.|T80\.|T88\.)/i,
      band: 'A2',
      points: 16,
      label: 'The descriptor names a device or a drug',
      reasoning: 'The descriptor attributes the condition to an internal prosthetic device, implant, graft, or therapeutic agent.',
    },
    // A3: Cause-neutral stand-in that frequently represents post-op complication
    {
      pattern: /^(L02\.|L03\.|L08\.|K65\.|A41\.|R65\.)/i,
      band: 'A3',
      points: 12,
      label: 'A cause-neutral stand-in for a complication code',
      reasoning: 'The diagnosis does not state the cause in its name, but clinically represents an infection, abscess, or sepsis occurring in a surgical bed.',
    },
    // A4: Injury needing an external event
    {
      pattern: /^(D62|S[0-9]{2}|T14\.)/i,
      band: 'A4',
      points: 10,
      label: 'An acute condition requiring an external event or blood loss',
      reasoning: 'The diagnosis describes an acute injury or posthemorrhagic anemia that requires an external acute trigger or surgical event.',
    },
    // A5: On a complication surveillance list, but silent on cause
    {
      pattern: /^(N17\.|N39\.0|J18\.|I26\.|I82\.)/i,
      band: 'A5',
      points: 6,
      label: 'On a complication list, but silent on cause',
      reasoning: 'The condition (e.g. acute kidney injury, catheter UTI, hospital-acquired pneumonia, DVT) is monitored for HAC, but the code descriptor is silent on etiology.',
    },
  ];

  /**
   * Evaluates the diagnosis cause transparency for the target suspected HAC condition.
   */
  public static evaluate(
    targetDiagnosis: DiagnosisEntry | undefined,
    config: HacConfigDTO
  ): ComponentAScore {
    const maxPoints = config.componentWeights.maxA;

    if (!targetDiagnosis || !targetDiagnosis.code) {
      return {
        component: 'A',
        title: 'Cause transparency of the diagnosis',
        code: 'UNKNOWN',
        description: 'No complication diagnosis specified on claim',
        band: 'A6',
        bandLabel: 'Unclassified / Missing diagnosis',
        points: 0,
        maxPoints,
        reasoning: 'No valid secondary diagnosis code was available to evaluate descriptor transparency.',
      };
    }

    const cleanCode = targetDiagnosis.code.trim().toUpperCase();

    for (const rule of this.RULES) {
      if (rule.pattern.test(cleanCode)) {
        return {
          component: 'A',
          title: 'Cause transparency of the diagnosis',
          code: cleanCode,
          description: targetDiagnosis.description || 'Diagnosis Code ' + cleanCode,
          band: rule.band,
          bandLabel: rule.label,
          points: Math.min(rule.points, maxPoints),
          maxPoints,
          reasoning: rule.reasoning,
        };
      }
    }

    // Default: A6 (Everything else)
    return {
      component: 'A',
      title: 'Cause transparency of the diagnosis',
      code: cleanCode,
      description: targetDiagnosis.description || 'Diagnosis Code ' + cleanCode,
      band: 'A6',
      bandLabel: 'Standard disease diagnosis (everything else)',
      points: 0,
      maxPoints,
      reasoning: 'The code descriptor contains no mention of surgical procedure, device, or acute post-procedural complication.',
    };
  }
}
