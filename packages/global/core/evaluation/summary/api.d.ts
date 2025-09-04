import type { CaculateMethodEnum } from '../constants';

// ===== Config API Types =====

export interface UpdateSummaryConfigBody {
  evalId: string;
  metricsConfig: Array<{
    metricsId: string;
    thresholdValue: number;
    weight?: number;
    caculateType?: CaculateMethodEnum;
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
  caculateType: CaculateMethodEnum;
  caculateTypeName: string;
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
