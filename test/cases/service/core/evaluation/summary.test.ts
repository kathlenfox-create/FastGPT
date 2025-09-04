import { beforeAll, afterAll, beforeEach, describe, test, expect, vi } from 'vitest';
import { EvaluationSummaryService } from '@fastgpt/service/core/evaluation/summary';
import { MongoEvaluation } from '@fastgpt/service/core/evaluation/task/schema';
import { MongoEvalMetric } from '@fastgpt/service/core/evaluation/metric/schema';
import type { AuthModeType } from '@fastgpt/service/support/permission/type';
import { Types } from '@fastgpt/service/common/mongo';
import { SummaryStatusEnum, CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';

// Mock dependencies
vi.mock('@fastgpt/service/core/evaluation/task/schema', () => ({
  MongoEvaluation: {
    findOne: vi.fn()
  }
}));

vi.mock('@fastgpt/service/core/evaluation/metric/schema', () => ({
  MongoEvalMetric: {
    find: vi.fn()
  }
}));

vi.mock('@fastgpt/service/core/evaluation/common', () => ({
  validateResourceAccess: vi.fn()
}));

describe('EvaluationTaskService.getEvaluationSummary', () => {
  const mockTeamId = new Types.ObjectId();
  const mockTmbId = new Types.ObjectId();
  const mockEvalId = new Types.ObjectId();
  const mockMetricId1 = new Types.ObjectId();
  const mockMetricId2 = new Types.ObjectId();

  const mockAuth: AuthModeType = {
    req: {} as any,
    authToken: true
  };

  const mockEvaluation = {
    _id: mockEvalId,
    teamId: mockTeamId,
    tmbId: mockTmbId,
    name: '测试评估任务',
    eval_data: [
      {
        metricsId: mockMetricId1.toString(),
        metricsScore: 85.5,
        summary: '指标1评估总结',
        summaryStatus: SummaryStatusEnum.done,
        errorReason: null
      },
      {
        metricsId: mockMetricId2.toString(),
        metricsScore: 92.0,
        summary: '指标2评估总结',
        summaryStatus: SummaryStatusEnum.done,
        errorReason: null
      }
    ],
    avgScore: 88.75
  };

  const mockMetrics = [
    {
      _id: mockMetricId1,
      name: '准确性指标',
      teamId: mockTeamId
    },
    {
      _id: mockMetricId2,
      name: '完整性指标',
      teamId: mockTeamId
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('应该成功获取评估总结报告', async () => {
    // Mock 数据库查询
    (MongoEvaluation.findOne as any).mockResolvedValue(mockEvaluation);
    (MongoEvalMetric.find as any).mockResolvedValue(mockMetrics);

    // 执行测试
    const result = await EvaluationTaskService.getEvaluationSummary(
      mockEvalId.toString(),
      mockAuth
    );

    // 验证结果
    expect(result).toEqual({
      data: [
        {
          metricsId: mockMetricId1.toString(),
          metricsName: '准确性指标',
          metricsScore: 85.5,
          summary: '指标1评估总结',
          summaryStatus: SummaryStatusEnum.done.toString(),
          errorReason: null
        },
        {
          metricsId: mockMetricId2.toString(),
          metricsName: '完整性指标',
          metricsScore: 92.0,
          summary: '指标2评估总结',
          summaryStatus: SummaryStatusEnum.done.toString(),
          errorReason: null
        }
      ],
      avgScore: 88.75
    });

    // 验证数据库调用
    expect(MongoEvaluation.findOne).toHaveBeenCalledWith({
      _id: mockEvalId,
      teamId: mockTeamId
    });
    expect(MongoEvalMetric.find).toHaveBeenCalledWith({
      _id: { $in: [mockMetricId1, mockMetricId2] },
      teamId: mockTeamId
    });
  });

  test('应该处理没有评估数据的情况', async () => {
    const evaluationWithoutData = {
      ...mockEvaluation,
      eval_data: []
    };

    (MongoEvaluation.findOne as any).mockResolvedValue(evaluationWithoutData);

    await expect(
      EvaluationTaskService.getEvaluationSummary(mockEvalId.toString(), mockAuth)
    ).rejects.toThrow('评估任务尚未完成或没有评估数据');
  });

  test('应该处理指标名称未找到的情况', async () => {
    const evaluationWithUnknownMetric = {
      ...mockEvaluation,
      eval_data: [
        {
          metricsId: 'unknown-metric-id',
          metricsScore: 85.5,
          summary: '测试总结',
          summaryStatus: SummaryStatusEnum.done,
          errorReason: null
        }
      ]
    };

    (MongoEvaluation.findOne as any).mockResolvedValue(evaluationWithUnknownMetric);
    (MongoEvalMetric.find as any).mockResolvedValue([]);

    const result = await EvaluationTaskService.getEvaluationSummary(
      mockEvalId.toString(),
      mockAuth
    );

    expect(result.data[0].metricsName).toBe('unknown-metric-id');
  });

  test('应该处理总结状态为失败的情况', async () => {
    const evaluationWithFailedSummary = {
      ...mockEvaluation,
      eval_data: [
        {
          metricsId: mockMetricId1.toString(),
          metricsScore: 0,
          summary: '',
          summaryStatus: SummaryStatusEnum.failed,
          errorReason: '总结生成失败：网络错误'
        }
      ],
      avgScore: 0
    };

    (MongoEvaluation.findOne as any).mockResolvedValue(evaluationWithFailedSummary);
    (MongoEvalMetric.find as any).mockResolvedValue([mockMetrics[0]]);

    const result = await EvaluationTaskService.getEvaluationSummary(
      mockEvalId.toString(),
      mockAuth
    );

    expect(result.data[0]).toEqual({
      metricsId: mockMetricId1.toString(),
      metricsName: '准确性指标',
      metricsScore: 0,
      summary: '',
      summaryStatus: SummaryStatusEnum.failed.toString(),
      errorReason: '总结生成失败：网络错误'
    });
  });
});

describe('EvaluationTaskService.getEvaluationSummaryConfig', () => {
  const mockTeamId = new Types.ObjectId();
  const mockTmbId = new Types.ObjectId();
  const mockEvalId = new Types.ObjectId();
  const mockMetricId1 = new Types.ObjectId();
  const mockMetricId2 = new Types.ObjectId();

  const mockAuth: AuthModeType = {
    req: {} as any,
    authToken: true
  };

  const mockEvaluationConfig = {
    _id: mockEvalId,
    teamId: mockTeamId,
    tmbId: mockTmbId,
    name: '测试评估任务',
    caculateType: CaculateMethodEnum.mean,
    evalData: [
      {
        metricsId: mockMetricId1.toString(),
        metricsScore: 85.5,
        thresholdValue: 80,
        weight: 0.6,
        summaryStatus: SummaryStatusEnum.completed
      },
      {
        metricsId: mockMetricId2.toString(),
        metricsScore: 92.0,
        thresholdValue: 90,
        weight: 0.4,
        summaryStatus: SummaryStatusEnum.completed
      }
    ]
  };

  const mockMetrics = [
    {
      _id: mockMetricId1,
      name: '准确性指标',
      teamId: mockTeamId
    },
    {
      _id: mockMetricId2,
      name: '完整性指标',
      teamId: mockTeamId
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock validateResourceAccess to return a filter
    const { validateResourceAccess } = require('@fastgpt/service/core/evaluation/common');
    validateResourceAccess.mockResolvedValue({
      resourceFilter: { _id: mockEvalId, teamId: mockTeamId }
    });
  });

  test('应该成功获取评估任务配置详情', async () => {
    // Mock 数据库查询
    (MongoEvaluation.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockEvaluationConfig)
    });
    (MongoEvalMetric.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockMetrics)
    });

    // 执行测试
    const result = await EvaluationTaskService.getEvaluationSummaryConfig(
      mockEvalId.toString(),
      mockAuth
    );

    // 验证结果
    expect(result).toEqual({
      caculateType: CaculateMethodEnum.mean,
      caculateTypeName: expect.any(String),
      metricsConfig: [
        {
          metricsId: mockMetricId1.toString(),
          metricsName: '准确性指标',
          thresholdValue: 80,
          weight: 0.6
        },
        {
          metricsId: mockMetricId2.toString(),
          metricsName: '完整性指标',
          thresholdValue: 90,
          weight: 0.4
        }
      ]
    });

    // 验证数据库调用
    expect(MongoEvaluation.findOne).toHaveBeenCalledWith({
      _id: mockEvalId,
      teamId: mockTeamId
    });
    expect(MongoEvalMetric.find).toHaveBeenCalledWith({
      _id: { $in: [mockMetricId1, mockMetricId2] },
      teamId: mockTeamId
    });
  });

  test('应该处理没有evalData的情况', async () => {
    const evaluationWithoutEvalData = {
      ...mockEvaluationConfig,
      evalData: []
    };

    (MongoEvaluation.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(evaluationWithoutEvalData)
    });
    (MongoEvalMetric.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([])
    });

    const result = await EvaluationTaskService.getEvaluationSummaryConfig(
      mockEvalId.toString(),
      mockAuth
    );

    expect(result).toEqual({
      caculateType: CaculateMethodEnum.mean,
      caculateTypeName: expect.any(String),
      metricsConfig: []
    });
  });

  test('应该处理指标名称未找到的情况', async () => {
    const evaluationWithUnknownMetric = {
      ...mockEvaluationConfig,
      evalData: [
        {
          metricsId: 'unknown-metric-id',
          metricsScore: 85.5,
          thresholdValue: 80,
          weight: 1.0,
          summaryStatus: SummaryStatusEnum.completed
        }
      ]
    };

    (MongoEvaluation.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(evaluationWithUnknownMetric)
    });
    (MongoEvalMetric.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([])
    });

    const result = await EvaluationTaskService.getEvaluationSummaryConfig(
      mockEvalId.toString(),
      mockAuth
    );

    expect(result.metricsConfig[0].metricsName).toBe('unknown-metric-id');
  });

  test('应该处理默认值情况', async () => {
    const evaluationWithMissingValues = {
      ...mockEvaluationConfig,
      caculateType: undefined,
      evalData: [
        {
          metricsId: mockMetricId1.toString(),
          metricsScore: 85.5
          // thresholdValue and weight are missing
        }
      ]
    };

    (MongoEvaluation.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(evaluationWithMissingValues)
    });
    (MongoEvalMetric.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([mockMetrics[0]])
    });

    const result = await EvaluationTaskService.getEvaluationSummaryConfig(
      mockEvalId.toString(),
      mockAuth
    );

    expect(result).toEqual({
      caculateType: CaculateMethodEnum.mean,
      caculateTypeName: expect.any(String),
      metricsConfig: [
        {
          metricsId: mockMetricId1.toString(),
          metricsName: '准确性指标',
          thresholdValue: 0,
          weight: 0
        }
      ]
    });
  });

  test('应该在评估任务不存在时抛出错误', async () => {
    (MongoEvaluation.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null)
    });

    await expect(
      EvaluationTaskService.getEvaluationSummaryConfig(mockEvalId.toString(), mockAuth)
    ).rejects.toThrow('评估任务不存在或无权限访问');
  });
});
