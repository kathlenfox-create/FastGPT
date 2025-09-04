import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ApiRequestProps } from '@fastgpt/service/type/next';

// Create test handler by importing the API handler function
const createMockHandler = () => {
  const { EvaluationSummaryService } = require('@fastgpt/service/core/evaluation/summary');
  const handler = require('@/pages/api/core/evaluation/summary/detail').default;
  
  return { handler, EvaluationSummaryService };
};

// Mock dependencies
vi.mock('@fastgpt/service/core/evaluation/summary', () => ({
  EvaluationSummaryService: {
    getEvaluationSummary: vi.fn()
  }
}));

vi.mock('@/service/middleware/entry', () => ({
  NextAPI: (handler: any) => handler
}));

vi.mock('@fastgpt/service/common/system/log', () => ({
  addLog: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

describe('/api/core/evaluation/summary/detail', () => {
  let handler: any;
  let mockEvaluationSummaryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockHandler();
    handler = mocks.handler;
    mockEvaluationSummaryService = mocks.EvaluationSummaryService;
  });

  const validRequest = {
    query: {
      evalId: '65f5b5b5b5b5b5b5b5b5b5b5'
    }
  } as ApiRequestProps<{}, any>;

  const mockSummaryResponse = {
    data: [
      {
        metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
        metricsName: '准确性指标',
        metricsScore: 85.5,
        summary: '该指标表现良好，大部分测试用例都通过了准确性检验。',
        summaryStatus: '2', // completed
        completedItemCount: 100,
        overThresholdItemCount: 85
      },
      {
        metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
        metricsName: '完整性指标',
        metricsScore: 92.0,
        summary: '完整性表现优秀，响应内容全面且详细。',
        summaryStatus: '2', // completed
        completedItemCount: 100,
        overThresholdItemCount: 92
      }
    ],
    aggregateScore: 88.75
  };

  describe('Parameter Validation', () => {
    it('should reject when evalId is missing', async () => {
      const req = {
        query: {}
      };

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });

    it('should reject when evalId is empty string', async () => {
      const req = {
        query: {
          evalId: ''
        }
      };

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });

    it('should reject when evalId is null', async () => {
      const req = {
        query: {
          evalId: null
        }
      };

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });

    it('should reject when evalId is undefined', async () => {
      const req = {
        query: {
          evalId: undefined
        }
      };

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });

    it('should handle missing query object', async () => {
      const req = {} as any;

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });

    it('should handle null query object', async () => {
      const req = { query: null } as any;

      await expect(handler(req)).rejects.toEqual('Evaluation task ID is required');
    });
  });

  describe('Successful Operations', () => {
    it('should successfully get evaluation summary details', async () => {
      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(mockSummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(mockSummaryResponse);
      expect(mockEvaluationSummaryService.getEvaluationSummary).toHaveBeenCalledWith(
        validRequest.query.evalId,
        {
          req: validRequest,
          authToken: true
        }
      );
    });

    it('should handle summary with empty data array', async () => {
      const emptySummaryResponse = {
        data: [],
        aggregateScore: 0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(emptySummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(emptySummaryResponse);
      expect(result.data).toHaveLength(0);
      expect(result.aggregateScore).toBe(0);
    });

    it('should handle single metric summary', async () => {
      const singleMetricResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '准确性指标',
            metricsScore: 78.5,
            summary: '准确性有待提高，建议优化模型参数。',
            summaryStatus: '2',
            completedItemCount: 50,
            overThresholdItemCount: 39
          }
        ],
        aggregateScore: 78.5
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(singleMetricResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(singleMetricResponse);
      expect(result.data).toHaveLength(1);
      expect(result.aggregateScore).toBe(78.5);
    });

    it('should handle summary with failed status', async () => {
      const failedSummaryResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '准确性指标',
            metricsScore: 0,
            summary: '',
            summaryStatus: '3', // failed
            errorReason: '总结生成失败：模型调用超时',
            completedItemCount: 100,
            overThresholdItemCount: 0
          }
        ],
        aggregateScore: 0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(failedSummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(failedSummaryResponse);
      expect(result.data[0].summaryStatus).toBe('3');
      expect(result.data[0].errorReason).toBe('总结生成失败：模型调用超时');
    });

    it('should handle summary with generating status', async () => {
      const generatingSummaryResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '准确性指标',
            metricsScore: 85.0,
            summary: '',
            summaryStatus: '1', // generating
            completedItemCount: 100,
            overThresholdItemCount: 85
          }
        ],
        aggregateScore: 85.0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(generatingSummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(generatingSummaryResponse);
      expect(result.data[0].summaryStatus).toBe('1');
      expect(result.data[0].summary).toBe('');
    });

    it('should handle summary with pending status', async () => {
      const pendingSummaryResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '准确性指标',
            metricsScore: 90.0,
            summary: '',
            summaryStatus: '0', // pending
            completedItemCount: 100,
            overThresholdItemCount: 90
          }
        ],
        aggregateScore: 90.0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(pendingSummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(pendingSummaryResponse);
      expect(result.data[0].summaryStatus).toBe('0');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      mockEvaluationSummaryService.getEvaluationSummary.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle evaluation not found error', async () => {
      const serviceError = '评估任务不存在或无权限访问';
      mockEvaluationSummaryService.getEvaluationSummary.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle permission denied error', async () => {
      const serviceError = new Error('Permission denied');
      mockEvaluationSummaryService.getEvaluationSummary.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle network timeout error', async () => {
      const serviceError = 'Network timeout';
      mockEvaluationSummaryService.getEvaluationSummary.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle valid ObjectId format evalId', async () => {
      const objectIdRequest = {
        query: {
          evalId: '507f1f77bcf86cd799439011'
        }
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(mockSummaryResponse);

      const result = await handler(objectIdRequest);

      expect(result).toEqual(mockSummaryResponse);
      expect(mockEvaluationSummaryService.getEvaluationSummary).toHaveBeenCalledWith(
        objectIdRequest.query.evalId,
        {
          req: objectIdRequest,
          authToken: true
        }
      );
    });

    it('should handle very large aggregate score', async () => {
      const highScoreResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '高性能指标',
            metricsScore: 99.99,
            summary: '表现极佳，超出预期。',
            summaryStatus: '2',
            completedItemCount: 1000,
            overThresholdItemCount: 999
          }
        ],
        aggregateScore: 99.99
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(highScoreResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(highScoreResponse);
      expect(result.aggregateScore).toBe(99.99);
    });

    it('should handle zero scores and counts', async () => {
      const zeroScoreResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '测试指标',
            metricsScore: 0,
            summary: '测试未通过任何检验点。',
            summaryStatus: '2',
            completedItemCount: 0,
            overThresholdItemCount: 0
          }
        ],
        aggregateScore: 0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(zeroScoreResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(zeroScoreResponse);
      expect(result.data[0].metricsScore).toBe(0);
      expect(result.data[0].completedItemCount).toBe(0);
      expect(result.data[0].overThresholdItemCount).toBe(0);
    });

    it('should handle multiple metrics with mixed statuses', async () => {
      const mixedStatusResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '指标1',
            metricsScore: 85.0,
            summary: '指标1总结已完成。',
            summaryStatus: '2', // completed
            completedItemCount: 100,
            overThresholdItemCount: 85
          },
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
            metricsName: '指标2',
            metricsScore: 75.0,
            summary: '',
            summaryStatus: '1', // generating
            completedItemCount: 100,
            overThresholdItemCount: 75
          },
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b8',
            metricsName: '指标3',
            metricsScore: 0,
            summary: '',
            summaryStatus: '3', // failed
            errorReason: '生成失败',
            completedItemCount: 100,
            overThresholdItemCount: 0
          }
        ],
        aggregateScore: 53.33
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(mixedStatusResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(mixedStatusResponse);
      expect(result.data).toHaveLength(3);
      expect(result.data[0].summaryStatus).toBe('2');
      expect(result.data[1].summaryStatus).toBe('1');
      expect(result.data[2].summaryStatus).toBe('3');
    });

    it('should handle long summary text', async () => {
      const longSummaryText = 'A'.repeat(5000); // Very long summary
      const longSummaryResponse = {
        data: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '详细指标',
            metricsScore: 88.0,
            summary: longSummaryText,
            summaryStatus: '2',
            completedItemCount: 1000,
            overThresholdItemCount: 880
          }
        ],
        aggregateScore: 88.0
      };

      mockEvaluationSummaryService.getEvaluationSummary.mockResolvedValue(longSummaryResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(longSummaryResponse);
      expect(result.data[0].summary).toHaveLength(5000);
    });
  });
});