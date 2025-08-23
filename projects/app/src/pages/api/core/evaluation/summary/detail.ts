import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { EvaluationTaskService } from '@fastgpt/service/core/evaluation/task';
import { addLog } from '@fastgpt/service/common/system/log';

// 请求参数类型
export type GetEvaluationSummaryQuery = {
    evalId: string;
};

// 返回数据类型
export type EvaluationSummaryResponse = {
    data: Array<{
        metricsId: string;
        metricsName: string;
        metricsScore: number;
        summary: string;
        summaryStatus: string;
        errorReason?: string;
    }>;
    avgScore: number;
};

async function handler(
    req: ApiRequestProps<{}, GetEvaluationSummaryQuery>
): Promise<EvaluationSummaryResponse> {
    try {
        const { evalId } = req.query;

        // 验证参数
        if (!evalId) {
            return Promise.reject('评估任务ID是必需的');
        }

        // 获取评估总结报告
        const result = await EvaluationTaskService.getEvaluationSummary(evalId, {
            req,
            authToken: true
        });

        addLog.info('[Evaluation] 评估总结报告查询成功', {
            evalId,
            dataCount: result.data.length,
            avgScore: result.avgScore
        });

        return result;
    } catch (error) {
        addLog.error('[Evaluation] 查询评估总结报告失败', {
            evalId: req.query?.evalId,
            error
        });
        return Promise.reject(error);
    }
}

export default NextAPI(handler);
