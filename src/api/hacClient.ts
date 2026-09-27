/**
 * ============================================================================
 * HAC SIGNAL INVESTIGATION - FRONTEND API CLIENT
 * ============================================================================
 * Connects the UI to the backend service. Enforces that the frontend NEVER
 * calculates scores, bands, or clinical inferences locally.
 */

import type {
  ClaimEntity,
  HacConfigDTO,
  HacInvestigationPayloadDTO,
  HumanReviewDecisionDTO,
  HumanReviewDecisionOutcome,
  ReviewerNoteDTO,
  ReviewQueueFilterDTO,
  ReviewQueueResponseDTO,
} from '../../server/contracts/hac.types.js';

export const getOrigin = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5173';
};

export const API_BASE = (import.meta as any).env?.VITE_API_URL || `${getOrigin()}/api/hac`;

export async function fetchInvestigation(claimId: string): Promise<HacInvestigationPayloadDTO> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/investigation`);
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Failed to fetch investigation for ${claimId}`);
  }
  return res.json();
}

export async function fetchReviewQueue(filter: ReviewQueueFilterDTO = {}): Promise<ReviewQueueResponseDTO> {
  const params = new URLSearchParams();
  if (filter.search) params.append('search', filter.search);
  if (filter.signalLevel) params.append('signalLevel', filter.signalLevel);
  if (filter.providerId) params.append('providerId', filter.providerId);
  if (filter.reviewStatus) params.append('reviewStatus', filter.reviewStatus);
  if (filter.assignedTo) params.append('assignedTo', filter.assignedTo);
  if (filter.startDate) params.append('startDate', filter.startDate);
  if (filter.endDate) params.append('endDate', filter.endDate);
  if (filter.page) params.append('page', String(filter.page));
  if (filter.pageSize) params.append('pageSize', String(filter.pageSize));
  if (filter.sortBy) params.append('sortBy', filter.sortBy);
  if (filter.sortDirection) params.append('sortDirection', filter.sortDirection);

  const res = await fetch(`${API_BASE}/review-queue?${params.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load review queue');
  }
  return res.json();
}

export async function fetchClaimNotes(claimId: string): Promise<ReviewerNoteDTO[]> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  const data = await res.json();
  return data.notes || [];
}

export async function addClaimNote(
  claimId: string,
  content: string,
  author = 'Clinical Reviewer',
  authorRole = 'Nurse Auditor'
): Promise<ReviewerNoteDTO> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author, authorRole, content }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit note');
  }
  return res.json();
}

export async function submitHumanReview(
  claimId: string,
  outcome: HumanReviewDecisionOutcome,
  rationale: string,
  reviewerId = 'USER-REV-01',
  reviewerName = 'Dr. Reviewer'
): Promise<HumanReviewDecisionDTO> {
  const res = await fetch(`${API_BASE}/claims/${claimId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome, rationale, reviewerId, reviewerName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit review decision');
  }
  const body = await res.json();
  return body.decision;
}

export async function fetchHacConfig(): Promise<HacConfigDTO> {
  const res = await fetch(`${API_BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch HAC configuration');
  return res.json();
}

export async function updateHacConfig(partial: Partial<HacConfigDTO>): Promise<HacConfigDTO> {
  const res = await fetch(`${API_BASE}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  });
  if (!res.ok) throw new Error('Failed to update HAC configuration');
  const body = await res.json();
  return body.config;
}

export async function uploadClaims(
  payload: { preset?: string; claims?: Partial<ClaimEntity>[] } | Partial<ClaimEntity>[]
): Promise<{ message: string; count: number; claims: ClaimEntity[]; investigationSummary?: any }> {
  const res = await fetch(`${API_BASE}/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to upload claims');
  }
  return res.json();
}

export async function resetClaimsQueue(): Promise<{ message: string; totalClaims: number }> {
  const res = await fetch(`${API_BASE}/claims/reset`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset claims queue');
  return res.json();
}

export interface EndpointTestResult {
  id: string;
  name: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT';
  status: number;
  durationMs: number;
  ok: boolean;
  summary: string;
  error?: string;
  samplePayload?: any;
}

export async function runAllFrontendApiTests(): Promise<EndpointTestResult[]> {
  const results: EndpointTestResult[] = [];

  const executeTest = async (
    id: string,
    name: string,
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    body?: any,
    summaryExtractor?: (data: any) => string
  ): Promise<EndpointTestResult> => {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const durationMs = Math.round(performance.now() - start);
      const data = await res.json().catch(() => ({}));
      const ok = res.ok;
      const summary = summaryExtractor ? summaryExtractor(data) : `Status ${res.status}`;
      return {
        id,
        name,
        endpoint: url,
        method,
        status: res.status,
        durationMs,
        ok,
        summary,
        samplePayload: data,
      };
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      return {
        id,
        name,
        endpoint: url,
        method,
        status: 0,
        durationMs,
        ok: false,
        summary: 'Network or server connection failed',
        error: err?.message || 'Failed to fetch',
      };
    }
  };

  // 1. Health check
  results.push(
    await executeTest('health', 'System Health Check', `${getOrigin()}/api/health`, 'GET', undefined, (d) => `Service: ${d.service} (${d.status})`)
  );

  // 2. Review Queue Query
  results.push(
    await executeTest(
      'queue',
      'Review Queue Query & Pagination',
      `${API_BASE}/review-queue?page=1&pageSize=4`,
      'GET',
      undefined,
      (d) => `Total: ${d.summaryCounts?.total ?? 0} claims, High: ${d.summaryCounts?.highPriority ?? 0}`
    )
  );

  // 3. Clinical Investigation
  results.push(
    await executeTest(
      'investigation',
      'HAC Signal Investigation Scoring',
      `${API_BASE}/claims/CLM-2024-001/investigation`,
      'GET',
      undefined,
      (d) => `Score: ${d.signalResult?.score}/100 (${d.signalResult?.level} priority)`
    )
  );

  // 4. Clinical Notes List
  results.push(
    await executeTest(
      'notes-get',
      'Fetch Clinical Audit Notes',
      `${API_BASE}/claims/CLM-2024-001/notes`,
      'GET',
      undefined,
      (d) => `Found ${d.totalNotes ?? 0} reviewer notes`
    )
  );

  // 5. Post Clinical Note
  results.push(
    await executeTest(
      'notes-post',
      'Add Clinical Audit Note',
      `${API_BASE}/claims/CLM-2024-001/notes`,
      'POST',
      { author: 'Frontend Automated Suite', authorRole: 'QA Audit', content: `Automated test note at ${new Date().toLocaleTimeString()}` },
      (d) => `Note created: ${d.id} by ${d.author}`
    )
  );

  // 6. Post Review Decision
  results.push(
    await executeTest(
      'review-post',
      'Submit Human Review Decision',
      `${API_BASE}/claims/CLM-2024-001/review`,
      'POST',
      { outcome: 'MONITOR', rationale: 'Routine system verification review.', reviewerId: 'AUTO-SUITE', reviewerName: 'System Suite' },
      (d) => `Status changed to: ${d.decision?.newStatus} (Outcome: ${d.decision?.outcome})`
    )
  );

  // 7. Ingest / Upload Preset Claim
  results.push(
    await executeTest(
      'claims-upload',
      'Ingest Clinical Claim (Preset)',
      `${API_BASE}/claims`,
      'POST',
      { preset: 'uti' },
      (d) => `${d.message} Ingested: ${d.claims?.[0]?.claimId} (Score: ${d.investigationSummary?.score ?? 'N/A'})`
    )
  );

  // 8. Config Read
  results.push(
    await executeTest(
      'config-get',
      'Read HAC Scoring Configuration',
      `${API_BASE}/config`,
      'GET',
      undefined,
      (d) => `Rules: ${d.audit?.rulesVersion ?? 'v3.1'}, Mid-Stay Threshold: ${d.thresholds?.midStayThresholdHours ?? 48}h`
    )
  );

  // 9. Config Update
  results.push(
    await executeTest(
      'config-put',
      'Update HAC Configuration',
      `${API_BASE}/config`,
      'PUT',
      { thresholds: { midStayHours: 48 } },
      (d) => `Config updated: midStayHours = ${d.config?.thresholds?.midStayHours}h`
    )
  );

  return results;
}
