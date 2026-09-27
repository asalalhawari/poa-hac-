/**
 * ============================================================================
 * AUDIT & TRACEABILITY SERVICE
 * ============================================================================
 * Generates cryptographically verifiable calculation hashes and stamps
 * audit metadata (modelVersion, rulesVersion, dataVersion, calculatedAt)
 * ensuring full historical reproducibility of clinical evaluations.
 */

import { createHash } from 'crypto';
import { AuditMetadataDTO, HacConfigDTO } from '../contracts/hac.types.js';

export class AuditService {
  /**
   * Generates a reproducible calculation audit record with SHA-256 hash.
   */
  public static generateAuditMetadata(
    claimId: string,
    componentScores: Record<string, number>,
    finalScore: number,
    config: HacConfigDTO
  ): AuditMetadataDTO {
    const calculatedAt = new Date().toISOString();

    const payloadToHash = {
      claimId,
      componentScores,
      finalScore,
      thresholds: config.thresholds,
      componentWeights: config.componentWeights,
      modelVersion: config.audit.modelVersion,
      rulesVersion: config.audit.rulesVersion,
      dataVersion: config.audit.dataVersion,
      calculatedAt,
    };

    const calculationHash = createHash('sha256')
      .update(JSON.stringify(payloadToHash))
      .digest('hex');

    return {
      modelVersion: config.audit.modelVersion,
      rulesVersion: config.audit.rulesVersion,
      calculatedAt,
      dataVersion: config.audit.dataVersion,
      calculationHash,
    };
  }
}
