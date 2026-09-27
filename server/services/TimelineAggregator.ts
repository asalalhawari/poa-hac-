/**
 * ============================================================================
 * TIMELINE AGGREGATOR
 * ============================================================================
 * Synthesizes claim dates, diagnosis appearance, procedure timestamps, and
 * clinical milestones into a unified, normalized chronological patient journey.
 */

import { ClaimEntity, EventStatus, EventType, TimelineEventDTO } from '../contracts/hac.types.js';

export class TimelineAggregator {
  /**
   * Builds a normalized, chronological event stream for a claim.
   */
  public static buildTimeline(claim: ClaimEntity): TimelineEventDTO[] {
    const events: TimelineEventDTO[] = [];
    const admMs = new Date(claim.admissionDateTime).getTime();

    // 1. Admission Event
    events.push({
      id: `evt-adm-${claim.claimId}`,
      dateTime: claim.admissionDateTime,
      formattedDateTime: this.formatDate(claim.admissionDateTime),
      elapsedHours: 0,
      eventType: 'admission',
      title: 'Admitted to Inpatient Care',
      subtitle: claim.primaryDiagnosis.description,
      status: 'normal',
      code: claim.primaryDiagnosis.code,
      details: [
        `Admission Diagnosis: ${claim.primaryDiagnosis.code} - ${claim.primaryDiagnosis.description}`,
        `Provider Facility: ${claim.providerFacilityCode} (${claim.providerDisplayName})`,
        'Inpatient admission established',
      ],
    });

    // 2. Procedures
    (claim.procedures || []).forEach((proc, idx) => {
      const procTime = proc.performedDateTime || claim.admissionDateTime;
      const elapsed = this.calculateElapsedHours(admMs, procTime);
      const isReturn = proc.isReturnToTheatre;
      const isRescue = proc.isRescueIntervention;

      let status: EventStatus = 'positive';
      let eventType: EventType = 'procedure';
      let title = 'Planned Surgery / Procedure';

      if (isReturn) {
        status = 'critical';
        title = 'Returned to Theatre (Unplanned)';
      } else if (isRescue) {
        status = 'critical';
        eventType = 'icu_transfer';
        title = 'Critical Care Rescue Escalation';
      } else if (!proc.isPlannedOnAdmission) {
        status = 'warning';
        title = 'Secondary In-Stay Procedure';
      }

      events.push({
        id: `evt-proc-${idx}-${claim.claimId}`,
        dateTime: procTime,
        formattedDateTime: this.formatDate(procTime),
        elapsedHours: elapsed,
        eventType,
        title,
        subtitle: proc.description,
        status,
        code: proc.code,
        details: [
          `Procedure Code: ${proc.code}`,
          proc.anatomicalSite ? `Anatomical Site: ${proc.anatomicalSite}` : 'Standard surgical protocol',
          isReturn
            ? 'Unplanned re-exploration in same body system'
            : proc.isPlannedOnAdmission
            ? 'Initial operative treatment as part of admission plan'
            : 'Intervention required during stay',
        ],
      });
    });

    // 3. Suspected HAC Diagnoses & Secondary Diagnoses
    (claim.diagnoses || []).forEach((diag, idx) => {
      if (diag.isPrimaryAdmissionDiagnosis) return; // handled in admission

      const obsTime = diag.firstObservedDateTime || claim.admissionDateTime;
      const elapsed = this.calculateElapsedHours(admMs, obsTime);
      const isHac = diag.isSuspectedHacCondition;

      events.push({
        id: `evt-diag-${idx}-${claim.claimId}`,
        dateTime: obsTime,
        formattedDateTime: this.formatDate(obsTime),
        elapsedHours: elapsed,
        eventType: 'diagnosis',
        title: isHac ? 'New Condition Documented (HAC Signal)' : 'Secondary Diagnosis Recorded',
        subtitle: diag.description,
        status: isHac ? 'warning' : 'normal',
        code: diag.code,
        details: [
          `Diagnosis Code: ${diag.code} - ${diag.description}`,
          elapsed !== null ? `First appearance: ${elapsed} hours after admission` : 'Timing inferred from service lines',
          isHac ? 'Condition was not documented on admission-day claim lines' : 'Co-morbid condition',
        ],
      });
    });

    // 4. Discharge Event (if stay completed)
    if (claim.dischargeDateTime) {
      const disMs = new Date(claim.dischargeDateTime).getTime();
      const elapsed = this.calculateElapsedHours(admMs, claim.dischargeDateTime);

      events.push({
        id: `evt-dis-${claim.claimId}`,
        dateTime: claim.dischargeDateTime,
        formattedDateTime: this.formatDate(claim.dischargeDateTime),
        elapsedHours: elapsed,
        eventType: 'discharge',
        title: 'Discharged from Facility',
        subtitle: 'Stay completed',
        status: 'positive',
        details: [
          `Total length of stay: ${claim.lengthOfStayDays} days`,
          'Discharge claim processed and routed for human clinical review',
          'No automated penalty or denial applied',
        ],
      });
    }

    // Sort chronologically by ISO timestamp
    events.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    return events;
  }

  private static calculateElapsedHours(admMs: number, eventTimeStr: string): number | null {
    const timeMs = new Date(eventTimeStr).getTime();
    if (isNaN(timeMs) || isNaN(admMs)) return null;
    const diff = timeMs - admMs;
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
  }

  private static formatDate(isoStr: string): string {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} · ${hours}:${minutes}`;
  }
}
