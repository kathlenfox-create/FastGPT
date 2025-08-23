import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { EvaluationTaskService } from '@fastgpt/service/core/evaluation/task';
import { addLog } from '@fastgpt/service/common/system/log';
import { CaculateMethodMap } from '@fastgpt/global/core/evaluation/constants';
import type { CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';

// 请求参数类型
export type GetConfigDetailQuery = {
    evalId: string;
};

// 返回数据类型
export type GetConfigDetailResponse = {
    caculateType: CaculateMethodEnum;
    caculateTypeName: string;
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

        // 验证参数
        if (!evalId || typeof evalId !== 'string') {
            return Promise.reject('evalId 必填');
        }

        // 获取评估任务配置详情
        const result = await EvaluationTaskService.getEvaluationSummaryConfig(evalId, {
            req,
            authToken: true
        });

        addLog.info('[Evaluation] 评估任务配置查询成功', {
            evalId,
            metricsCount: result.metricsConfig.length
        });

        return result;
    } catch (error) {
        addLog.error('[Evaluation] 查询评估任务配置失败', {
            evalId: req.query?.evalId,
            error
        });
        return Promise.reject(error);
    }
}

export default NextAPI(handler);