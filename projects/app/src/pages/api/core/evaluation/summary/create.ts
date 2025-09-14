import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { EvaluationSummaryService } from '@fastgpt/service/core/evaluation/summary';
import { addLog } from '@fastgpt/service/common/system/log';
import type {
  GenerateSummaryParams,
  GenerateSummaryResponse
} from '@fastgpt/global/core/evaluation/type';
import { EvaluationErrEnum } from '@fastgpt/global/common/error/code/evaluation';
import { authEvaluationTaskWrite } from '@fastgpt/service/core/evaluation/common';
import { checkTeamAIPoints } from '@fastgpt/service/support/permission/teamLimit';

async function handler(
  req: ApiRequestProps<GenerateSummaryParams>
): Promise<GenerateSummaryResponse> {
  try {
    const { evalId, metricsIds } = req.body;

    // Validate parameters
    if (!evalId) {
      return Promise.reject(EvaluationErrEnum.evalIdRequired);
    }
    if (!metricsIds || !Array.isArray(metricsIds) || metricsIds.length === 0) {
      return Promise.reject(EvaluationErrEnum.summaryMetricsConfigError);
    }

    // Deduplicate metricsIds to avoid duplicate processing
    const uniqueMetricsIds = [...new Set(metricsIds)];

    if (uniqueMetricsIds.length !== metricsIds.length) {
      addLog.info('[EvaluationSummary] Removed duplicate metricsIds in API layer', {
        evalId,
        originalCount: metricsIds.length,
        uniqueCount: uniqueMetricsIds.length,
        duplicates: metricsIds.filter((id, index) => metricsIds.indexOf(id) !== index)
      });
    }

    const { teamId, tmbId, evaluation } = await authEvaluationTaskWrite(evalId, {
      req,
      authApiKey: true,
      authToken: true
    });

    // Check AI points availability
    await checkTeamAIPoints(teamId);

    addLog.info('[EvaluationSummary] Starting summary report generation', {
      evalId,
      metricsIds: uniqueMetricsIds,
      metricsCount: uniqueMetricsIds.length
    });

    // Generate summary report asynchronously
    await EvaluationSummaryService.generateSummaryReports(evalId, uniqueMetricsIds);

    const response: GenerateSummaryResponse = {
      success: true,
      message: 'Report generation task started'
    };

    return response;
  } catch (error) {
    addLog.error('[EvaluationSummary] Failed to start report generation task', {
      evalId: req.body?.evalId,
      metricsIds: req.body?.metricsIds,
      error
    });
    return Promise.reject(error);
  }
}

export default NextAPI(handler);
export { handler };
