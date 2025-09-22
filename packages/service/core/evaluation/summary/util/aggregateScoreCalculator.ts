import { addLog } from '../../../../common/system/log';
import { MongoEvalItem, MongoEvaluation } from '../../task/schema';
import { Types } from 'mongoose';
import { EvaluationStatusEnum } from '@fastgpt/global/core/evaluation/constants';
import { distributedLock, readWriteLock } from '../../../../common/redis/distributedLock';

// Calculate aggregateScore for a single evaluation item
export const calculateEvaluationItemAggregateScore = async (
  evalItemId: string,
  session?: any,
  hasConfigLock?: boolean
): Promise<number> => {
  try {
    const evalItem = await MongoEvalItem.findById(evalItemId).lean();
    if (!evalItem || !evalItem.evaluatorOutputs || evalItem.evaluatorOutputs.length === 0) {
      return 0;
    }

    const evalId = evalItem.evalId.toString();

    // 如果调用者已经持有配置锁，直接执行
    if (hasConfigLock) {
      return await _calculateEvaluationItemAggregateScoreInternal(evalItem, evalId, session);
    }

    // 否则申请读锁（允许并发读取，只在配置更新时阻塞）
    const lockKey = `evaluation_config:${evalId}`;
    return await readWriteLock.withReadLock(
      lockKey,
      async () => {
        return await _calculateEvaluationItemAggregateScoreInternal(evalItem, evalId, session);
      },
      30, // 30秒超时
      20, // 适中的重试次数
      200 // 每次重试间隔200ms
    );
  } catch (error) {
    addLog.error(`[Evaluation] Error calculating aggregateScore for item: ${evalItemId}`, error);
    return 0;
  }
};

// 内部计算逻辑，不包含锁
const _calculateEvaluationItemAggregateScoreInternal = async (
  evalItem: any,
  evalId: string,
  session?: any
): Promise<number> => {
  // Get evaluation task to access summaryConfigs for weights
  const evaluation = await MongoEvaluation.findById(evalId).lean();
  if (!evaluation || !evaluation.summaryConfigs || evaluation.summaryConfigs.length === 0) {
    return 0;
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Calculate weighted score for each evaluator
  evalItem.evaluatorOutputs.forEach((evaluatorOutput: any, index: number) => {
    const score = evaluatorOutput?.data?.score;
    if (score !== undefined && score !== null && evaluation.summaryConfigs[index]) {
      const weight = evaluation.summaryConfigs[index].weight || 0;
      const scoreScaling = evaluation.evaluators[index]?.scoreScaling || 1;

      // Apply score scaling and calculate weighted score
      const scaledScore = score * scoreScaling;
      totalWeightedScore += scaledScore * weight;
      totalWeight += weight;
    }
  });

  // Calculate aggregate score
  const aggregateScore =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) / 100 : 0;

  addLog.debug(
    `[Evaluation] Calculated aggregateScore for item: ${evalItem._id}, score: ${aggregateScore}`,
    {
      evalItemId: evalItem._id.toString(),
      totalWeightedScore,
      totalWeight,
      aggregateScore
    }
  );

  return aggregateScore;
};

// Recalculate aggregate scores for all evaluation items in a given evaluation task
export const recalculateAllEvaluationItemAggregateScores = async (
  evalId: string,
  session?: any,
  hasConfigLock?: boolean
): Promise<void> => {
  // 如果调用者已经持有配置锁，直接执行
  if (hasConfigLock) {
    addLog.info('[Evaluation] Executing item aggregate scores recalculation with existing lock', {
      evalId,
      hasConfigLock: !!hasConfigLock,
      hasSession: !!session
    });
    return await _recalculateAllEvaluationItemAggregateScoresInternal(evalId, session);
  }

  // 否则申请写锁（需要修改数据，使用写锁确保独占性）
  const lockKey = `evaluation_config:${evalId}`;
  return await readWriteLock.withWriteLock(
    lockKey,
    async () => {
      addLog.info(
        '[Evaluation] Starting item aggregate scores recalculation with acquired write lock',
        {
          evalId,
          lockKey
        }
      );

      await _recalculateAllEvaluationItemAggregateScoresInternal(evalId, session);

      addLog.info(
        '[Evaluation] Item aggregate scores recalculation completed with acquired write lock',
        {
          evalId,
          lockKey
        }
      );
    },
    45, // 45秒超时，重新计算可能需要较长时间
    20, // 最多重试20次
    300 // 每次重试间隔300ms
  );
};

// 内部实现，不包含锁逻辑
const _recalculateAllEvaluationItemAggregateScoresInternal = async (
  evalId: string,
  session?: any
): Promise<void> => {
  try {
    addLog.info('[Evaluation] Starting recalculation of all evaluation item aggregate scores', {
      evalId
    });

    // Get all completed evaluation items for this evaluation
    const query = MongoEvalItem.find({
      evalId: new Types.ObjectId(evalId),
      status: EvaluationStatusEnum.completed,
      evaluatorOutputs: { $exists: true, $nin: [null, []] }
    });

    if (session) {
      query.session(session);
    }

    const evalItems = await query.lean();

    if (evalItems.length === 0) {
      addLog.info('[Evaluation] No completed evaluation items found for recalculation', {
        evalId
      });
      return;
    }

    // Recalculate aggregate score for each item
    const updatePromises = evalItems.map(async (item) => {
      // 传递hasConfigLock=true，因为外层已经持有配置锁
      const aggregateScore = await calculateEvaluationItemAggregateScore(
        item._id.toString(),
        session,
        true
      );

      return MongoEvalItem.updateOne({ _id: item._id }, { $set: { aggregateScore } }, { session });
    });

    await Promise.all(updatePromises);

    addLog.info('[Evaluation] Successfully recalculated all evaluation item aggregate scores', {
      evalId,
      updatedItemsCount: evalItems.length
    });
  } catch (error) {
    addLog.error('[Evaluation] Failed to recalculate evaluation item aggregate scores', {
      evalId,
      error
    });
    throw error;
  }
};
