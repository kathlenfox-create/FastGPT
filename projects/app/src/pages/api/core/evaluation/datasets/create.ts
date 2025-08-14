import type { NextApiRequest, NextApiResponse } from 'next';
import { jsonRes } from '@fastgpt/service/common/response';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { MongoEvaluationDataset } from '@fastgpt/service/core/evaluation/evaluationDatasetSchema';
import { EvaluationDataset } from '@fastgpt/service/core/evaluation/domain/EvaluationDataset';
import type { CreateEvaluationDatasetBody } from '@fastgpt/global/core/evaluation/type';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { teamId, tmbId } = await authCert({ req, authToken: true });

    const body = req.body as CreateEvaluationDatasetBody;

    // 创建评估数据集
    const dataset = new EvaluationDataset({
      name: body.name,
      description: body.description,
      version: body.version,
      data: body.data,
      tags: body.tags,
      source_type: body.source_type,
      source_config: body.source_config,
      teamId,
      tmbId
    });

    // 保存到数据库
    const dbDataset = await MongoEvaluationDataset.create({
      teamId,
      tmbId,
      name: dataset.name,
      description: dataset.description,
      version: dataset.version,
      data: dataset.data,
      tags: dataset.tags,
      source_type: dataset.source_type,
      source_config: dataset.source_config,
      created_at: dataset.created_at,
      updated_at: dataset.updated_at
    });

    jsonRes(res, {
      data: {
        id: dbDataset._id,
        name: dbDataset.name,
        description: dbDataset.description,
        version: dbDataset.version,
        data: dbDataset.data,
        tags: dbDataset.tags,
        source_type: dbDataset.source_type,
        source_config: dbDataset.source_config,
        created_at: dbDataset.created_at,
        updated_at: dbDataset.updated_at
      }
    });
  } catch (error) {
    jsonRes(res, {
      code: 500,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
}
