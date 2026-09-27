/**
 * ============================================================================
 * HAC CONFIGURATION SERVICE
 * ============================================================================
 * Single source of truth for configurable clinical thresholds, component
 * maximums, suppressor toggles, and audit metadata.
 *
 * Core Principle: Business logic MUST NOT hardcode time windows or points.
 */

import { HacConfigDTO } from '../contracts/hac.types.js';

class HacConfigurationManager {
  private config: HacConfigDTO = {
    thresholds: {
      midStayThresholdHours: 48,
      earlyWindowHours: 24,
      historyLookbackDays: 90,
      interventionScoreCap: 25,
    },
    signalLevelCutoffs: {
      high: 65,
      review: 50,
      monitor: 25,
    },
    componentWeights: {
      maxA: 20,
      maxB: 20,
      maxC: 20,
      maxD: 25,
      maxE: 15,
    },
    suppressors: {
      enablePalliativeCareExclusion: true,
      enablePlannedStagedExclusion: true,
    },
    audit: {
      modelVersion: 'hac-ai-path-v2.4',
      rulesVersion: 'poa-hac-ruleset-v3.1.0',
      dataVersion: 'om-dhamani-fhir-2026.09',
    },
  };

  /**
   * Retrieves an immutable snapshot of the active configuration
   */
  public getConfig(): Readonly<HacConfigDTO> {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Updates configuration dynamically with validation
   */
  public updateConfig(partialConfig: Partial<HacConfigDTO>): HacConfigDTO {
    if (partialConfig.thresholds) {
      if (
        partialConfig.thresholds.midStayThresholdHours !== undefined &&
        partialConfig.thresholds.midStayThresholdHours <= 0
      ) {
        throw new Error('midStayThresholdHours must be a positive integer');
      }
      this.config.thresholds = {
        ...this.config.thresholds,
        ...partialConfig.thresholds,
      };
    }

    if (partialConfig.signalLevelCutoffs) {
      this.config.signalLevelCutoffs = {
        ...this.config.signalLevelCutoffs,
        ...partialConfig.signalLevelCutoffs,
      };
    }

    if (partialConfig.componentWeights) {
      this.config.componentWeights = {
        ...this.config.componentWeights,
        ...partialConfig.componentWeights,
      };
    }

    if (partialConfig.suppressors) {
      this.config.suppressors = {
        ...this.config.suppressors,
        ...partialConfig.suppressors,
      };
    }

    if (partialConfig.audit) {
      this.config.audit = {
        ...this.config.audit,
        ...partialConfig.audit,
      };
    }

    return this.getConfig();
  }

  /**
   * Resets configuration to system defaults (useful for test isolation)
   */
  public resetToDefaults(): void {
    this.config = {
      thresholds: {
        midStayThresholdHours: 48,
        earlyWindowHours: 24,
        historyLookbackDays: 90,
        interventionScoreCap: 25,
      },
      signalLevelCutoffs: {
        high: 65,
        review: 50,
        monitor: 25,
      },
      componentWeights: {
        maxA: 20,
        maxB: 20,
        maxC: 20,
        maxD: 25,
        maxE: 15,
      },
      suppressors: {
        enablePalliativeCareExclusion: true,
        enablePlannedStagedExclusion: true,
      },
      audit: {
        modelVersion: 'hac-ai-path-v2.4',
        rulesVersion: 'poa-hac-ruleset-v3.1.0',
        dataVersion: 'om-dhamani-fhir-2026.09',
      },
    };
  }
}

export const HacConfigService = new HacConfigurationManager();
