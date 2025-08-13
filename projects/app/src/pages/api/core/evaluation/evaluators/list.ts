import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvaluator } from '@fastgpt/service/core/evaluation/evaluatorSchema';
import type { ListEvaluatorsBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const { searchKey = '', pageNum = 1, pageSize = 20 } = req.body as ListEvaluatorsBody;

    const match = {
      teamId,
      ...(searchKey ? { name: { $regex: searchKey, $options: 'i' } } : {})
    };

    const [evaluators, total] = await Promise.all([
      MongoEvaluator.find(match)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MongoEvaluator.countDocuments(match)
    ]);

    jsonRes(res, {
      data: {
        list: evaluators.map(evaluator => ({
          id: evaluator._id,
          name: evaluator.name,
          description: evaluator.description,
          config: evaluator.config,
          created_at: evaluator.created_at,
          updated_at: evaluator.updated_at
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
