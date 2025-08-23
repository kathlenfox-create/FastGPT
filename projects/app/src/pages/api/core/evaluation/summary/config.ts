import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { EvaluationTaskService } from '@fastgpt/service/core/evaluation/task';
import { addLog } from '@fastgpt/service/common/system/log';
import type { CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';

export type UpdateSummaryConfigBody = {
    evalId: string;
    caculateType: CaculateMethodEnum;
    metricsConfig: Array<{
        metricsId: string;
        thresholdValue: number;
        weight?: number;
    }>;
};

export type UpdateSummaryConfigResponse = { message: string };

async function handler(
    req: ApiRequestProps<UpdateSummaryConfigBody>
): Promise<UpdateSummaryConfigResponse> {
    try {
        const { evalId, caculateType, metricsConfig } = req.body || ({} as any);

        // 基础参数校验
        if (!evalId || typeof evalId !== 'string') {
            return Promise.reject('evalId 必填');
        }

        if (caculateType === undefined || caculateType === null) {
            return Promise.reject('caculateType 必填');
        }

        if (!Array.isArray(metricsConfig) || metricsConfig.length === 0) {
            return Promise.reject('metricsConfig 不能为空');
        }

        // 进一步规则：当 metricsConfig 长度 >= 3 时，需要提供 weight
        const needWeight = metricsConfig.length >= 3;
        for (const item of metricsConfig) {
            if (!item.metricsId || typeof item.metricsId !== 'string') {
                return Promise.reject('metricsConfig.metricsId 必填');
            }
            if (typeof item.thresholdValue !== 'number' || Number.isNaN(item.thresholdValue)) {
                return Promise.reject('metricsConfig.thresholdValue 必须为数字');
            }
            if (needWeight && (typeof item.weight !== 'number' || Number.isNaN(item.weight))) {
                return Promise.reject('当配置 3 个及以上指标时，metricsConfig.weight 必须为数字');
            }
        }

        await EvaluationTaskService.updateEvaluationSummaryConfig(
            evalId,
            caculateType,
            metricsConfig,
            { req, authToken: true }
        );

        addLog.info('[Evaluation] 更新总结配置成功', {
            evalId,
            metricCount: metricsConfig.length
        });

        return { message: 'ok' };
    } catch (error) {
        addLog.error('[Evaluation] 更新总结配置失败', error);
        return Promise.reject(error);
    }
}

export default NextAPI(handler);




 
