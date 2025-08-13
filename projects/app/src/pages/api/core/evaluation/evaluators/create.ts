import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvaluator } from '@fastgpt/service/core/evaluation/evaluatorSchema';
import { Evaluator } from '@fastgpt/service/core/evaluation/domain/Evaluator';
import type { CreateEvaluatorBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId, tmbId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const body = req.body as CreateEvaluatorBody;

    // 创建评估器
    const evaluator = new Evaluator({
      name: body.name,
      description: body.description,
      config: body.config,
      teamId,
      tmbId
    });

    // 保存到数据库
    const dbEvaluator = await MongoEvaluator.create({
      teamId,
      tmbId,
      name: evaluator.name,
      description: evaluator.description,
      config: evaluator.config,
      created_at: evaluator.created_at,
      updated_at: evaluator.updated_at
    });

    jsonRes(res, {
      data: {
        id: dbEvaluator._id,
        name: dbEvaluator.name,
        description: dbEvaluator.description,
        config: dbEvaluator.config,
        created_at: dbEvaluator.created_at,
        updated_at: dbEvaluator.updated_at
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
