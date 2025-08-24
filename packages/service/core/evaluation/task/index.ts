import { MongoEvaluation, MongoEvalItem } from './schema';
import { MongoEvalMetric } from '../metric/schema';
import type {
  EvaluationSchemaType,
  EvalItemSchemaType,
  CreateEvaluationParams,
  evaluationType,
  listEvalItemsItem
} from '@fastgpt/global/core/evaluation/type';
import type { AuthModeType } from '../../../support/permission/type';
import {
  validateResourceAccess,
  validateResourceCreate,
  validateListAccess,
  checkUpdateResult,
  checkDeleteResult
} from '../common';
import { CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';
import { EvaluationStatusEnum, CaculateMethodMap } from '@fastgpt/global/core/evaluation/constants';
import { Types } from '../../../common/mongo';
import { evaluationTaskQueue } from '../mq';
import { createTrainingUsage } from '../../../support/wallet/usage/controller';
import { UsageSourceEnum } from '@fastgpt/global/support/wallet/usage/constants';
import { addLog } from '../../../common/system/log';

/**
 * 根据evalId和status查询eval_items表数据
 * @param evalId 评估任务ID
 * @param status 评估状态
 * @returns 返回匹配的评估项列表
 */

export class EvaluationTaskService {
  // 创建评估任务
  static async createEvaluation(
    params: CreateEvaluationParams,
    auth: AuthModeType
  ): Promise<EvaluationSchemaType> {
    const { teamId, tmbId } = await validateResourceCreate(auth);

    // 创建用量记录
    const { billId } = await createTrainingUsage({
      teamId,
      tmbId,
      appName: params.name,
      billSource: UsageSourceEnum.evaluation
    });

    const evaluation = await MongoEvaluation.create({
      ...params,
      teamId,
      tmbId,
      usageId: billId,
      status: EvaluationStatusEnum.queuing,
      createTime: new Date()
    });

    return evaluation.toObject();
  }

  // 获取评估任务
  static async getEvaluation(
    evaluationId: string,
    auth: AuthModeType
  ): Promise<EvaluationSchemaType> {
    const { resourceFilter, notFoundError } = await validateResourceAccess(
      evaluationId,
      auth,
      'Evaluation'
    );

    const evaluation = await MongoEvaluation.findOne(resourceFilter).lean();

    if (!evaluation) {
      throw new Error(notFoundError);
    }

    return evaluation;
  }

  // 更新评估任务
  static async updateEvaluation(
    evaluationId: string,
    updates: Partial<CreateEvaluationParams>,
    auth: AuthModeType
  ): Promise<void> {
    const { resourceFilter } = await validateResourceAccess(evaluationId, auth, 'Evaluation');

    const result = await MongoEvaluation.updateOne(resourceFilter, { $set: updates });

    checkUpdateResult(result, 'Evaluation');
  }

  // 删除评估任务
  static async deleteEvaluation(evaluationId: string, auth: AuthModeType): Promise<void> {
    const { resourceFilter } = await validateResourceAccess(evaluationId, auth, 'Evaluation');

    // 删除评估任务的所有评估项
    await MongoEvalItem.deleteMany({ evalId: evaluationId });

    const result = await MongoEvaluation.deleteOne(resourceFilter);

    checkDeleteResult(result, 'Evaluation');
  }

  // 获取评估任务列表
  static async listEvaluations(
    auth: AuthModeType,
    page: number = 1,
    pageSize: number = 20,
    searchKey?: string
  ): Promise<{
    evaluations: evaluationType[];
    total: number;
  }> {
    const { filter, skip, limit, sort } = await validateListAccess(auth, searchKey, page, pageSize);

    const [evaluations, total] = await Promise.all([
      MongoEvaluation.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'eval_datasets',
            localField: 'datasetId',
            foreignField: '_id',
            as: 'dataset'
          }
        },
        {
          $lookup: {
            from: 'eval_targets',
            localField: 'targetId',
            foreignField: '_id',
            as: 'target'
          }
        },
        {
          $lookup: {
            from: 'eval_metrics',
            localField: 'metricIds',
            foreignField: '_id',
            as: 'metrics'
          }
        },
        {
          $lookup: {
            from: 'teammembers',
            localField: 'tmbId',
            foreignField: '_id',
            as: 'executor'
          }
        },
        {
          $lookup: {
            from: 'eval_items',
            localField: '_id',
            foreignField: 'evalId',
            as: 'evalItems'
          }
        },
        {
          $addFields: {
            datasetName: { $arrayElemAt: ['$dataset.name', 0] },
            targetName: { $arrayElemAt: ['$target.name', 0] },
            metricNames: '$metrics.name',
            executorName: { $arrayElemAt: ['$executor.memberName', 0] },
            executorAvatar: { $arrayElemAt: ['$executor.avatar', 0] },
            totalCount: { $size: '$evalItems' },
            completedCount: {
              $size: {
                $filter: {
                  input: '$evalItems',
                  cond: { $eq: ['$$this.status', EvaluationStatusEnum.completed] }
                }
              }
            },
            errorCount: {
              $size: {
                $filter: {
                  input: '$evalItems',
                  cond: { $ne: ['$$this.errorMessage', null] }
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            createTime: 1,
            finishTime: 1,
            status: 1,
            errorMessage: 1,
            avgScore: 1,
            datasetName: 1,
            targetName: 1,
            metricNames: 1,
            executorName: 1,
            executorAvatar: 1,
            totalCount: 1,
            completedCount: 1,
            errorCount: 1
          }
        },
        { $sort: sort },
        { $skip: skip },
        { $limit: limit }
      ]),
      MongoEvaluation.countDocuments(filter)
    ]);

    return { evaluations, total };
  }

  // 获取评估项列表
  static async listEvaluationItems(
    evaluationId: string,
    auth: AuthModeType,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    items: listEvalItemsItem[];
    total: number;
  }> {
    // 验证评估任务访问权限
    await this.getEvaluation(evaluationId, auth);

    const skip = (page - 1) * pageSize;
    const limit = pageSize;

    const [items, total] = await Promise.all([
      MongoEvalItem.find({ evalId: evaluationId })
        .sort({ createTime: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .then((items) =>
          items.map((item) => ({
            ...item,
            evalItemId: item._id.toString()
          }))
        ),
      MongoEvalItem.countDocuments({ evalId: evaluationId })
    ]);

    return { items, total };
  }

  // 启动评估任务
  static async startEvaluation(evaluationId: string, auth: AuthModeType): Promise<void> {
    const evaluation = await this.getEvaluation(evaluationId, auth);

    if (evaluation.status !== EvaluationStatusEnum.queuing) {
      throw new Error('Only queuing evaluations can be started');
    }

    // 更新状态为处理中
    await MongoEvaluation.updateOne(
      { _id: evaluationId },
      { $set: { status: EvaluationStatusEnum.evaluating } }
    );

    // 提交到队列
    await evaluationTaskQueue.add(`eval_task_${evaluationId}`, {
      evalId: evaluationId,
      datasetId: evaluation.datasetId,
      targetId: evaluation.targetId,
      metricIds: evaluation.metricIds
    });

    addLog.info(`[Evaluation] 任务已提交到队列: ${evaluationId}`);
  }

  // 停止评估任务
  static async stopEvaluation(evaluationId: string, auth: AuthModeType): Promise<void> {
    const evaluation = await this.getEvaluation(evaluationId, auth);

    if (
      ![EvaluationStatusEnum.evaluating, EvaluationStatusEnum.queuing].includes(evaluation.status)
    ) {
      throw new Error('Only running or queuing evaluations can be stopped');
    }

    // 更新状态为已完成（手动停止）
    await MongoEvaluation.updateOne(
      { _id: evaluationId },
      {
        $set: {
          status: EvaluationStatusEnum.completed,
          finishTime: new Date(),
          errorMessage: 'Manually stopped'
        }
      }
    );

    // 停止所有相关的评估项
    await MongoEvalItem.updateMany(
      {
        evalId: evaluationId,
        status: { $in: [EvaluationStatusEnum.queuing, EvaluationStatusEnum.evaluating] }
      },
      {
        $set: {
          status: EvaluationStatusEnum.completed,
          errorMessage: 'Manually stopped',
          finishTime: new Date()
        }
      }
    );

    addLog.info(`[Evaluation] 任务已手动停止: ${evaluationId}`);
  }

  // 重启失败的评估任务
  static async restartEvaluation(evaluationId: string, auth: AuthModeType): Promise<void> {
    const evaluation = await this.getEvaluation(evaluationId, auth);

    if (evaluation.status !== EvaluationStatusEnum.completed) {
      throw new Error('Only completed evaluations can be restarted');
    }

    // 重置任务状态
    await MongoEvaluation.updateOne(
      { _id: evaluationId },
      {
        $set: {
          status: EvaluationStatusEnum.queuing,
          finishTime: null,
          avgScore: null,
          errorMessage: null
        }
      }
    );

    // 重置失败的评估项
    await MongoEvalItem.updateMany(
      { evalId: evaluationId },
      {
        $set: {
          status: EvaluationStatusEnum.queuing,
          response: null,
          responseTime: null,
          finishTime: null,
          score: null,
          metricResults: [],
          errorMessage: null,
          retry: 3
        }
      }
    );

    addLog.info(`[Evaluation] 任务已重置为排队状态: ${evaluationId}`);
  }

  // 获取评估任务统计信息
  static async getEvaluationStats(
    evaluationId: string,
    auth: AuthModeType
  ): Promise<{
    total: number;
    completed: number;
    evaluating: number;
    queuing: number;
    error: number;
    avgScore?: number;
  }> {
    await this.getEvaluation(evaluationId, auth);

    const stats = await MongoEvalItem.aggregate([
      { $match: { evalId: evaluationId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' }
        }
      }
    ]);

    const result = {
      total: 0,
      completed: 0,
      evaluating: 0,
      queuing: 0,
      error: 0,
      avgScore: undefined as number | undefined
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      switch (stat._id) {
        case EvaluationStatusEnum.completed:
          result.completed = stat.count;
          if (stat.avgScore) {
            result.avgScore = Math.round(stat.avgScore * 100) / 100;
          }
          break;
        case EvaluationStatusEnum.evaluating:
          result.evaluating = stat.count;
          break;
        case EvaluationStatusEnum.queuing:
          result.queuing = stat.count;
          break;
      }
    });

    // 统计错误项
    result.error = await MongoEvalItem.countDocuments({
      evalId: evaluationId,
      errorMessage: { $ne: null }
    });

    return result;
  }

  // ========================= 评估项相关接口 =========================

  // 获取评估项详情
  static async getEvaluationItem(itemId: string, auth: AuthModeType): Promise<EvalItemSchemaType> {
    const item = await MongoEvalItem.findById(itemId).lean();

    if (!item) {
      throw new Error('Evaluation item not found');
    }

    // 验证评估任务的访问权限
    await this.getEvaluation(item.evalId, auth);

    return item;
  }

  // 更新评估项
  static async updateEvaluationItem(
    itemId: string,
    updates: Partial<EvalItemSchemaType>,
    auth: AuthModeType
  ): Promise<void> {
    await this.getEvaluationItem(itemId, auth);

    const result = await MongoEvalItem.updateOne({ _id: itemId }, { $set: updates });

    checkUpdateResult(result, 'Evaluation item');
  }

  // 删除评估项
  static async deleteEvaluationItem(itemId: string, auth: AuthModeType): Promise<void> {
    await this.getEvaluationItem(itemId, auth);

    const result = await MongoEvalItem.deleteOne({ _id: itemId });

    checkDeleteResult(result, 'Evaluation item');
  }

  // 重试评估项
  static async retryEvaluationItem(itemId: string, auth: AuthModeType): Promise<void> {
    const item = await this.getEvaluationItem(itemId, auth);

    if (item.status !== EvaluationStatusEnum.completed || !item.errorMessage) {
      throw new Error('Only failed evaluation items can be retried');
    }

    await MongoEvalItem.updateOne(
      { _id: itemId },
      {
        $set: {
          status: EvaluationStatusEnum.queuing,
          response: null,
          responseTime: null,
          finishTime: null,
          score: null,
          metricResults: [],
          errorMessage: null,
          retry: Math.max(item.retry || 0, 1) // 确保至少有1次重试机会
        }
      }
    );

    addLog.info(`[Evaluation] 评估项已重置为排队状态: ${itemId}`);
  }

  // 批量重试失败的评估项
  static async retryFailedItems(evaluationId: string, auth: AuthModeType): Promise<number> {
    await this.getEvaluation(evaluationId, auth);

    const result = await MongoEvalItem.updateMany(
      {
        evalId: evaluationId,
        status: EvaluationStatusEnum.completed,
        errorMessage: { $ne: null }
      },
      {
        $set: {
          status: EvaluationStatusEnum.queuing,
          response: null,
          responseTime: null,
          finishTime: null,
          score: null,
          metricResults: [],
          errorMessage: null
        },
        $inc: {
          retry: 1
        }
      }
    );

    addLog.info(`[Evaluation] 批量重试失败项: ${evaluationId}, 影响数量: ${result.modifiedCount}`);

    return result.modifiedCount;
  }

  // 获取评估项的详细结果
  static async getEvaluationItemResult(
    itemId: string,
    auth: AuthModeType
  ): Promise<{
    item: EvalItemSchemaType;
    dataItem: any;
    response?: string;
    metricResults: any[];
    score?: number;
  }> {
    const item = await this.getEvaluationItem(itemId, auth);

    return {
      item,
      dataItem: item.dataItem,
      response: item.response,
      metricResults: item.metricResults || [],
      score: item.score
    };
  }

  // 搜索评估项
  static async searchEvaluationItems(
    evaluationId: string,
    auth: AuthModeType,
    options: {
      status?: EvaluationStatusEnum;
      hasError?: boolean;
      scoreRange?: { min?: number; max?: number };
      keyword?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{
    items: listEvalItemsItem[];
    total: number;
  }> {
    await this.getEvaluation(evaluationId, auth);

    const { status, hasError, scoreRange, keyword, page = 1, pageSize = 20 } = options;

    // 构建查询条件
    const filter: any = { evalId: evaluationId };

    if (status !== undefined) {
      filter.status = status;
    }

    if (hasError === true) {
      filter.errorMessage = { $ne: null };
    } else if (hasError === false) {
      filter.errorMessage = null;
    }

    if (scoreRange) {
      const scoreFilter: any = {};
      if (scoreRange.min !== undefined) {
        scoreFilter.$gte = scoreRange.min;
      }
      if (scoreRange.max !== undefined) {
        scoreFilter.$lte = scoreRange.max;
      }
      if (Object.keys(scoreFilter).length > 0) {
        filter.score = scoreFilter;
      }
    }

    if (keyword) {
      filter.$or = [
        { 'dataItem.question': { $regex: keyword, $options: 'i' } },
        { 'dataItem.expectedResponse': { $regex: keyword, $options: 'i' } },
        { response: { $regex: keyword, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      MongoEvalItem.find(filter)
        .sort({ createTime: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .then((items) =>
          items.map((item) => ({
            ...item,
            evalItemId: item._id.toString()
          }))
        ),
      MongoEvalItem.countDocuments(filter)
    ]);

    return { items, total };
  }

  // 导出评估项结果
  static async exportEvaluationResults(
    evaluationId: string,
    auth: AuthModeType,
    format: 'csv' | 'json' = 'json'
  ): Promise<Buffer> {
    await this.getEvaluation(evaluationId, auth);

    const items = await MongoEvalItem.find({ evalId: evaluationId }).sort({ createTime: 1 }).lean();

    if (format === 'json') {
      const results = items.map((item) => ({
        itemId: item._id,
        question: item.dataItem?.question,
        expectedResponse: item.dataItem?.expectedResponse,
        response: item.response,
        score: item.score,
        status: item.status,
        metricResults: item.metricResults,
        errorMessage: item.errorMessage,
        responseTime: item.responseTime,
        finishTime: item.finishTime
      }));

      return Buffer.from(JSON.stringify(results, null, 2));
    } else {
      // CSV格式
      if (items.length === 0) {
        return Buffer.from('');
      }

      const headers = [
        'ItemId',
        'Question',
        'ExpectedResponse',
        'Response',
        'Score',
        'Status',
        'ErrorMessage',
        'ResponseTime',
        'FinishTime'
      ];

      const csvRows = [headers.join(',')];

      items.forEach((item) => {
        const row = [
          item._id.toString(),
          `"${(item.dataItem?.question || '').replace(/"/g, '""')}"`,
          `"${(item.dataItem?.expectedResponse || '').replace(/"/g, '""')}"`,
          `"${(item.response || '').replace(/"/g, '""')}"`,
          item.score || '',
          item.status || '',
          `"${(item.errorMessage || '').replace(/"/g, '""')}"`,
          item.responseTime || '',
          item.finishTime || ''
        ];
        csvRows.push(row.join(','));
      });

      return Buffer.from(csvRows.join('\n'));
    }
  }

  // 获取评估总结报告
  static async getEvaluationSummary(
    evaluationId: string,
    auth: AuthModeType
  ): Promise<{
    data: Array<{
      metricsId: string;
      metricsName: string;
      metricsScore: number;
      summary: string;
      summaryStatus: string;
      errorReason?: string;
    }>;
    avgScore: number;
  }> {
    const { resourceFilter } = await validateResourceAccess(evaluationId, auth, 'Evaluation');

    console.log(`resourceFilter is ${JSON.stringify(resourceFilter)}`)
    console.log(`==========================`)

    // 查询评估任务
    const evalId = resourceFilter?._id;
    console.log(`evalId is ${JSON.stringify(evalId)}`)

    const evaluation = await MongoEvaluation.findOne({ _id: evalId }).lean();

    if (!evaluation) {
      throw new Error('评估任务不存在或无权限访问');
    }
    console.log(`evaluation is ${JSON.stringify(evaluation)}`)

    // 检查评估任务是否已完成
    if (!evaluation.evalData || evaluation.evalData.length === 0) {
      throw new Error('评估任务尚未完成或没有评估数据');
    }

    // 获取指标信息以获取指标名称
    const metricIds = evaluation.evalData.map(item => item.metricsId);
    const metrics = await MongoEvalMetric.find({
      _id: { $in: metricIds.map(id => new Types.ObjectId(id)) },
      teamId: new Types.ObjectId(evaluation.teamId)
    }).lean();

    // 创建指标ID到名称的映射
    const metricNameMap = new Map(
      metrics.map(metric => [metric._id.toString(), metric.name])
    );

    console.log(`metricNameMap is ${JSON.stringify(metricNameMap)}`)
    console.log(`xxxxxxx`)


    // 构建返回数据
    const data = evaluation.evalData.map((item) => ({
      metricsId: item.metricsId,
      metricsName: metricNameMap.get(item.metricsId) || item.metricsId,
      metricsScore: item.metricsScore,
      summary: item.summary || '',
      summaryStatus: item.summaryStatus?.toString() || '0',
      errorReason: item.errorReason
    }));

    // 计算综合得分
    const avgScore = evaluation.avgScore || 0;

    return {
      data,
      avgScore
    };
  }

  // 更新评估总结配置（阈值、权重、计算方式）
  static async updateEvaluationSummaryConfig(
    evaluationId: string,
    caculateType: CaculateMethodEnum,
    metricsConfig: Array<{
      metricsId: string;
      thresholdValue: number;
      weight?: number;
    }>,
    auth: AuthModeType
  ): Promise<void> {
    //todo 鉴权
    // const { resourceFilter } = await validateResourceAccess(evaluationId, auth, 'Evaluation');
    // 读取评估信息，校验指标归属
    const evaluation = await MongoEvaluation.findOne({ _id: evaluationId }).lean();
    if (!evaluation) throw new Error('Evaluation not found');
    const evalMetricIdSet = new Set((evaluation.metricIds || []).map((id: any) => id.toString()));
    for (const m of metricsConfig) {
      if (!evalMetricIdSet.has(m.metricsId)) {
        throw new Error(`metricsId ${m.metricsId} 不属于该评估任务`);
      }
    }

    // 基于现有 evalData 更新/新增配置（阈值、权重）
    const currentEvalData: any[] = Array.isArray((evaluation as any).evalData)
      ? (evaluation as any).evalData
      : [];

    const configMap = new Map(
      metricsConfig.map((m) => [m.metricsId, { thresholdValue: m.thresholdValue, weight: m.weight }])
    );

    const nextEvalDataMap = new Map<string, any>();
    for (const row of currentEvalData) {
      nextEvalDataMap.set(row.metricsId, { ...row });
    }
    for (const [metricsId, cfg] of configMap) {
      const existed = nextEvalDataMap.get(metricsId) || { metricsId };
      nextEvalDataMap.set(metricsId, {
        ...existed,
        thresholdValue: cfg.thresholdValue,
        ...(cfg.weight !== undefined ? { weight: cfg.weight } : {})
      });
    }

    const nextEvalData = Array.from(nextEvalDataMap.values());

    await MongoEvaluation.updateOne({ _id: evaluationId },
      {
        $set: {
          evalData: nextEvalData,
          caculateType: caculateType
        }
      });
  }

  // 获取评估总结配置详情
  static async getEvaluationSummaryConfig(
    evaluationId: string,
    auth: AuthModeType
  ): Promise<{
    caculateType: CaculateMethodEnum;
    caculateTypeName: string;
    metricsConfig: Array<{
      metricsId: string;
      metricsName: string;
      thresholdValue: number;
      weight: number;
    }>;
  }> {
    const { resourceFilter } = await validateResourceAccess(evaluationId, auth, 'Evaluation');

    // 查询评估任务
    const evaluation = await MongoEvaluation.findOne(resourceFilter).lean();

    if (!evaluation) {
      throw new Error('评估任务不存在或无权限访问');
    }

    // 获取指标信息以获取指标名称
    const metricIds = evaluation.evalData?.map(item => item.metricsId) || [];
    const metrics = await MongoEvalMetric.find({
      _id: { $in: metricIds.map(id => new Types.ObjectId(id)) },
      teamId: new Types.ObjectId(evaluation.teamId)
    }).lean();

    // 创建指标ID到名称的映射
    const metricNameMap = new Map(
      metrics.map(metric => [metric._id.toString(), metric.name])
    );

    // 构建返回数据
    const metricsConfig = (evaluation.evalData || []).map((item) => ({
      metricsId: item.metricsId,
      metricsName: metricNameMap.get(item.metricsId) || item.metricsId,
      thresholdValue: item.thresholdValue || 0,
      weight: item.weight || 0
    }));

    // 获取计算方式和其对应的中文说明
    const caculateType = evaluation.caculateType || CaculateMethodEnum.mean;

    return {
      caculateType,
      caculateTypeName: CaculateMethodMap[caculateType]?.name || 'Unknown',
      metricsConfig
    };
  }

  static async queryEvalItems(
    evalId: string,
    status: EvaluationStatusEnum
  ): Promise<EvalItemSchemaType[]> {
    try {
      const items = await MongoEvalItem.find({
        evalId,
        status
      })
        .sort({ createTime: -1 })
        .lean();

      return items;
    } catch (error) {
      throw new Error(`查询评估项失败: ${error}`);
    }
  }
}
