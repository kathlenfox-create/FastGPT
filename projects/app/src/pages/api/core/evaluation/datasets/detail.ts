import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { connectToDatabase } from '@fastgpt/service/common/mongo';
import { authCert } from '@fastgpt/service/support/permission/auth';
import { MongoEvaluationDataset } from '@fastgpt/service/core/evaluation/evaluationDatasetSchema';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId } = await authCert({ req, authToken: true });
    await connectToDatabase();

    const { id } = req.query as { id: string };

    if (!id) {
      return jsonRes(res, {
        code: 400,
        error: 'Dataset ID is required'
      });
    }

    const dataset = await MongoEvaluationDataset.findOne({
      _id: id,
      teamId
    }).lean();

    if (!dataset) {
      return jsonRes(res, {
        code: 404,
        error: 'Dataset not found'
      });
    }

    jsonRes(res, {
      data: {
        id: dataset._id,
        name: dataset.name,
        description: dataset.description,
        version: dataset.version,
        data: dataset.data,
        tags: dataset.tags,
        source_type: dataset.source_type,
        source_config: dataset.source_config,
        created_at: dataset.created_at,
        updated_at: dataset.updated_at
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
