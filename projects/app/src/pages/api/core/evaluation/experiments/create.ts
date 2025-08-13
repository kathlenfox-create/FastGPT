import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvalExperiment } from '@fastgpt/service/core/evaluation/evalExperimentSchema';
import { EvalExperiment } from '@fastgpt/service/core/evaluation/domain/EvalExperiment';
import { addEvaluationExperimentJob } from '@fastgpt/service/core/evaluation/mq';
import type { CreateEvalExperimentBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId, tmbId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const body = req.body as CreateEvalExperimentBody;

    // 创建评估实验
    const experiment = new EvalExperiment({
      name: body.name,
      description: body.description,
      dataset_id: body.dataset_id,
      target_id: body.target_id,
      evaluator_ids: body.evaluator_ids,
      config: body.config,
      teamId,
      tmbId
    });

    // 保存到数据库
    const dbExperiment = await MongoEvalExperiment.create({
      teamId,
      tmbId,
      name: experiment.name,
      description: experiment.description,
      dataset_id: experiment.dataset_id,
      target_id: experiment.target_id,
      evaluator_ids: experiment.evaluator_ids,
      status: experiment.status,
      progress: experiment.progress,
      results: experiment.results,
      config: experiment.config,
      created_at: experiment.created_at,
      updated_at: experiment.updated_at
    });

    // 添加评估实验任务到队列
    try {
      await addEvaluationExperimentJob({
        experimentId: dbExperiment._id.toString()
      });
    } catch (error) {
      // 如果添加队列任务失败，记录错误但不影响实验创建
      console.error('Failed to add experiment to queue:', error);
    }

    jsonRes(res, {
      data: {
        id: dbExperiment._id,
        name: dbExperiment.name,
        description: dbExperiment.description,
        dataset_id: dbExperiment.dataset_id,
        target_id: dbExperiment.target_id,
        evaluator_ids: dbExperiment.evaluator_ids,
        status: dbExperiment.status,
        progress: dbExperiment.progress,
        results: dbExperiment.results,
        config: dbExperiment.config,
        created_at: dbExperiment.created_at,
        updated_at: dbExperiment.updated_at
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
