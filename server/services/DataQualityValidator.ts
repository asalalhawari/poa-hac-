/**
 * ============================================================================
 * DATA QUALITY VALIDATOR
 * ============================================================================
 * Validates clinical timestamps, coding taxonomy compliance, and longitudinal
 * history availability to guard against degraded calculations.
 */

import {
  ClaimEntity,
  DataQualityFlag,
  DataQualityStatus,
  DataQualitySummary,
} from '../contracts/hac.types.js';

export class DataQualityValidator {
  /**
   * Validates a claim entity and generates a comprehensive DataQualitySummary
   */
  public static validate(claim: ClaimEntity): DataQualitySummary {
    const flags: DataQualityFlag[] = [];

    // 1. Admission timestamp check
    if (!claim.admissionDateTime || !this.isValidIsoDate(claim.admissionDateTime)) {
      flags.push({
        code: 'DQ_ERR_MISSING_ADMISSION_TIME',
        severity: 'CRITICAL',
        field: 'admissionDateTime',
        message: 'Admission datetime is missing or not a valid ISO-8601 string.',
        mitigation: 'Component B POA timing cannot be precisely evaluated; human review required.',
      });
    }

    // 2. Discharge timestamp consistency check
    if (claim.dischargeDateTime) {
      if (!this.isValidIsoDate(claim.dischargeDateTime)) {
        flags.push({
          code: 'DQ_WARN_INVALID_DISCHARGE_TIME',
          severity: 'WARNING',
          field: 'dischargeDateTime',
          message: 'Discharge datetime is present but format is invalid ISO-8601.',
          mitigation: 'Length of stay calculated from estimated duration.',
        });
      } else if (
        claim.admissionDateTime &&
        new Date(claim.dischargeDateTime).getTime() < new Date(claim.admissionDateTime).getTime()
      ) {
        flags.push({
          code: 'DQ_ERR_DISCHARGE_BEFORE_ADMISSION',
          severity: 'CRITICAL',
          field: 'dischargeDateTime',
          message: 'Discharge datetime is chronologically earlier than admission datetime.',
          mitigation: 'Flagged for data integrity verification by payer audit team.',
        });
      }
    }

    // 3. Suspected HAC diagnosis & observation timestamp check
    const hacDiagnosis = claim.diagnoses.find((d) => d.isSuspectedHacCondition);
    if (!hacDiagnosis) {
      flags.push({
        code: 'DQ_ERR_NO_HAC_DIAGNOSIS',
        severity: 'CRITICAL',
        field: 'diagnoses',
        message: 'Claim does not have any secondary diagnosis flagged as suspected HAC condition.',
        mitigation: 'Scoring evaluated against primary diagnosis fallback.',
      });
    } else {
      if (!hacDiagnosis.code || hacDiagnosis.code.trim() === '') {
        flags.push({
          code: 'DQ_ERR_MISSING_DIAGNOSIS_CODE',
          severity: 'CRITICAL',
          field: 'diagnoses.code',
          message: 'Complication diagnosis code string is empty.',
          mitigation: 'Component A classification defaulted to unclassified.',
        });
      }

      if (!hacDiagnosis.firstObservedDateTime || !this.isValidIsoDate(hacDiagnosis.firstObservedDateTime)) {
        flags.push({
          code: 'DQ_WARN_MISSING_DIAGNOSIS_TIME',
          severity: 'WARNING',
          field: 'diagnoses.firstObservedDateTime',
          message: 'Timestamp of first appearance for complication diagnosis is missing.',
          mitigation: 'Component B will default to B_UNKNOWN; reviewer must check paper chart / EHR.',
        });
      }
    }

    // 4. Provider identifier check (ensure no free-text risk)
    if (!claim.providerId || claim.providerId.trim() === '') {
      flags.push({
        code: 'DQ_WARN_MISSING_PROVIDER_ID',
        severity: 'WARNING',
        field: 'providerId',
        message: 'Structured provider identifier is missing; risk of provider misattribution.',
        mitigation: 'Provider linkage score (Component E) will be marked unverified.',
      });
    }

    // 5. Patient longitudinal history availability
    if (!claim.isPatientHistoryAvailable) {
      flags.push({
        code: 'DQ_INFO_HISTORY_UNAVAILABLE',
        severity: 'INFO',
        field: 'patientHistory',
        message: 'Cross-facility member claims history was not searchable for this episode.',
        mitigation: 'Component E will record history unavailable rather than absence of complication.',
      });
    }

    // Determine overall status
    let overallStatus: DataQualityStatus = 'COMPLETE';
    const hasCritical = flags.some((f) => f.severity === 'CRITICAL');
    const hasWarning = flags.some((f) => f.severity === 'WARNING');

    if (hasCritical) {
      overallStatus = 'DEGRADED';
    } else if (hasWarning) {
      overallStatus = 'PARTIAL';
    }

    const isReliable = !hasCritical;

    return {
      overallStatus,
      isReliable,
      flags,
    };
  }

  private static isValidIsoDate(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }
}
