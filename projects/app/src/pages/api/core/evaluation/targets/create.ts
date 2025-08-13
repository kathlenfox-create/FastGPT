import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvalTarget } from '@fastgpt/service/core/evaluation/evalTargetSchema';
import { EvalTarget } from '@fastgpt/service/core/evaluation/domain/EvalTarget';
import type { CreateEvalTargetBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId, tmbId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const body = req.body as CreateEvalTargetBody;

    // 创建评估目标
    const target = new EvalTarget({
      name: body.name,
      description: body.description,
      config: body.config,
      teamId,
      tmbId
    });

    // 保存到数据库
    const dbTarget = await MongoEvalTarget.create({
      teamId,
      tmbId,
      name: target.name,
      description: target.description,
      config: target.config,
      created_at: target.created_at,
      updated_at: target.updated_at
    });

    jsonRes(res, {
      data: {
        id: dbTarget._id,
        name: dbTarget.name,
        description: dbTarget.description,
        config: dbTarget.config,
        created_at: dbTarget.created_at,
        updated_at: dbTarget.updated_at
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
