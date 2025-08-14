import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoEvalExperiment } from '@fastgpt/service/core/evaluation/evalExperimentSchema';
import type { ListEvalExperimentsBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId } = await authCert({ req, authToken: true });

    const { searchKey = '', pageNum = 1, pageSize = 20 } = req.body as ListEvalExperimentsBody;

    const match = {
      teamId,
      ...(searchKey ? { name: { $regex: searchKey, $options: 'i' } } : {})
    };

    const [experiments, total] = await Promise.all([
      MongoEvalExperiment.find(match)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MongoEvalExperiment.countDocuments(match)
    ]);

    jsonRes(res, {
      data: {
        list: experiments.map((experiment) => ({
          id: experiment._id,
          name: experiment.name,
          description: experiment.description,
          dataset_id: experiment.dataset_id,
          target_id: experiment.target_id,
          evaluator_ids: experiment.evaluator_ids,
          status: experiment.status,
          progress: experiment.progress,
          results: experiment.results,
          config: experiment.config,
          error: experiment.error,
          created_at: experiment.created_at,
          updated_at: experiment.updated_at,
          started_at: experiment.started_at,
          completed_at: experiment.completed_at
        })),
        total,
        pageNum,
        pageSize
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
