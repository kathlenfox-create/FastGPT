import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoEvaluationDataset } from '@fastgpt/service/core/evaluation/evaluationDatasetSchema';
import type { ListEvaluationDatasetsBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId } = await authCert({ req, authToken: true });

    const { searchKey = '', pageNum = 1, pageSize = 20 } = req.body as ListEvaluationDatasetsBody;

    const match = {
      teamId,
      ...(searchKey ? { name: { $regex: searchKey, $options: 'i' } } : {})
    };

    const [datasets, total] = await Promise.all([
      MongoEvaluationDataset.find(match)
        .sort({ created_at: -1 })
        .skip((pageNum - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      MongoEvaluationDataset.countDocuments(match)
    ]);

    jsonRes(res, {
      data: {
        list: datasets.map((dataset) => ({
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
