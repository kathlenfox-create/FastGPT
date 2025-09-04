import type { CalculateMethodEnum } from '../constants';

// ===== Config API Types =====

export interface UpdateSummaryConfigBody {
  evalId: string;
  metricsConfig: Array<{
    metricsId: string;
    thresholdValue: number;
    weight?: number;
    calculateType?: CalculateMethodEnum;
  }>;
}

export interface UpdateSummaryConfigResponse {
  message: string;
}

// ===== Config Detail API Types =====

export interface GetConfigDetailQuery {
  evalId: string;
}

export interface GetConfigDetailResponse {
  calculateType: CalculateMethodEnum;
  calculateTypeName: string;
  metricsConfig: Array<{
    metricsId: string;
    metricsName: string;
    thresholdValue: number;
    weight: number;
  }>;
}

// ===== Summary Detail API Types =====

export interface GetEvaluationSummaryQuery {
  evalId: string;
}

export interface EvaluationSummaryResponse {
  data: Array<{
    metricsId: string;
    metricsName: string;
    metricsScore: number;
    summary: string;
    summaryStatus: string;
    errorReason?: string;
    completedItemCount: number;
    overThresholdItemCount: number;
  }>;
  aggregateScore: number;
}

// ===== Generate Summary API Types =====
// Note: GenerateSummaryParams and GenerateSummaryResponse are already defined in ../type.d.ts
