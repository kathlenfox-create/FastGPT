import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvalTarget } from '@fastgpt/service/core/evaluation/evalTargetSchema';
import type { ListEvalTargetsBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const { searchKey = '', pageNum = 1, pageSize = 20 } = req.body as ListEvalTargetsBody;

    const match = {
      teamId,
      ...(searchKey ? { name: { $regex: searchKey, $options: 'i' } } : {})
    };

    const [targets, total] = await Promise.all([
      MongoEvalTarget.find(match)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MongoEvalTarget.countDocuments(match)
    ]);

    jsonRes(res, {
      data: {
        list: targets.map(target => ({
          id: target._id,
          name: target.name,
          description: target.description,
          config: target.config,
          created_at: target.created_at,
          updated_at: target.updated_at
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
