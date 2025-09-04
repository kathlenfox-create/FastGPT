import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { EvaluationTaskService } from '@fastgpt/service/core/evaluation/task';
import { addLog } from '@fastgpt/service/common/system/log';
import { CaculateMethodMap } from '@fastgpt/global/core/evaluation/constants';
import type { CalculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';
import { EvaluationSummaryService } from '@fastgpt/service/core/evaluation/summary';

// Request parameter type
export type GetConfigDetailQuery = {
  evalId: string;
};

// Response data type
export type GetConfigDetailResponse = {
  calculateType: CalculateMethodEnum;
  calculateTypeName: string;
  metricsConfig: Array<{
    metricsId: string;
    metricsName: string;
    thresholdValue: number;
    weight: number;
  }>;
};

async function handler(
  req: ApiRequestProps<{}, GetConfigDetailQuery>
): Promise<GetConfigDetailResponse> {
  try {
    const { evalId } = req.query;

    // Validate parameters
    if (!evalId || typeof evalId !== 'string') {
      return Promise.reject('evalId is required');
    }

    // Get evaluation task configuration details
    const result = await EvaluationSummaryService.getEvaluationSummaryConfig(evalId, {
      req,
      authToken: true
    });

    addLog.info('[Evaluation] Evaluation task configuration query successful', {
      evalId,
      metricsCount: result.metricsConfig.length
    });

    return {
      calculateType: result.calculateType,
      calculateTypeName: result.calculateTypeName,
      metricsConfig: result.metricsConfig
    };
  } catch (error) {
    addLog.error('[Evaluation] Failed to query evaluation task configuration', {
      evalId: req.query?.evalId,
      error
    });
    return Promise.reject(error);
  }
}

export default NextAPI(handler);
