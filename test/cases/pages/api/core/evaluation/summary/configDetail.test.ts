import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';

// Create test handler by importing the API handler function
const createMockHandler = () => {
  const { EvaluationSummaryService } = require('@fastgpt/service/core/evaluation/summary');
  const handler = require('@/pages/api/core/evaluation/summary/configDetail').default;
  
  return { handler, EvaluationSummaryService };
};

// Mock dependencies
vi.mock('@fastgpt/service/core/evaluation/summary', () => ({
  EvaluationSummaryService: {
    getEvaluationSummaryConfig: vi.fn()
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

describe('/api/core/evaluation/summary/configDetail', () => {
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

  const mockConfigResponse = {
    caculateType: CaculateMethodEnum.mean,
    caculateTypeName: 'Mean',
    metricsConfig: [
      {
        metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
        metricsName: '准确性指标',
        thresholdValue: 80,
        weight: 0.6
      },
      {
        metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
        metricsName: '完整性指标',
        thresholdValue: 90,
        weight: 0.4
      }
    ]
  };

  describe('Parameter Validation', () => {
    it('should reject when evalId is missing', async () => {
      const req = {
        query: {}
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when evalId is not a string', async () => {
      const req = {
        query: {
          evalId: 123
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when evalId is empty string', async () => {
      const req = {
        query: {
          evalId: ''
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when evalId is null', async () => {
      const req = {
        query: {
          evalId: null
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when evalId is undefined', async () => {
      const req = {
        query: {
          evalId: undefined
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });
  });

  describe('Successful Operations', () => {
    it('should successfully get evaluation configuration details', async () => {
      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(mockConfigResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(mockConfigResponse);
      expect(mockEvaluationSummaryService.getEvaluationSummaryConfig).toHaveBeenCalledWith(
        validRequest.query.evalId,
        {
          req: validRequest,
          authToken: true
        }
      );
    });

    it('should handle configuration with median calculation type', async () => {
      const medianConfigResponse = {
        ...mockConfigResponse,
        caculateType: CaculateMethodEnum.median,
        caculateTypeName: 'Median'
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(medianConfigResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(medianConfigResponse);
      expect(result.caculateType).toBe(CaculateMethodEnum.median);
      expect(result.caculateTypeName).toBe('Median');
    });

    it('should handle empty metrics configuration', async () => {
      const emptyConfigResponse = {
        caculateType: CaculateMethodEnum.mean,
        caculateTypeName: 'Mean',
        metricsConfig: []
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(emptyConfigResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(emptyConfigResponse);
      expect(result.metricsConfig).toHaveLength(0);
    });

    it('should handle single metric configuration', async () => {
      const singleMetricResponse = {
        caculateType: CaculateMethodEnum.mean,
        caculateTypeName: 'Mean',
        metricsConfig: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '准确性指标',
            thresholdValue: 85,
            weight: 1.0
          }
        ]
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(singleMetricResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(singleMetricResponse);
      expect(result.metricsConfig).toHaveLength(1);
      expect(result.metricsConfig[0].weight).toBe(1.0);
    });

    it('should handle configuration with zero threshold and weights', async () => {
      const zeroValueConfigResponse = {
        caculateType: CaculateMethodEnum.mean,
        caculateTypeName: 'Mean',
        metricsConfig: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '测试指标',
            thresholdValue: 0,
            weight: 0
          }
        ]
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(zeroValueConfigResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(zeroValueConfigResponse);
      expect(result.metricsConfig[0].thresholdValue).toBe(0);
      expect(result.metricsConfig[0].weight).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle evaluation not found error', async () => {
      const serviceError = 'Evaluation task not found';
      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle permission denied error', async () => {
      const serviceError = '评估任务不存在或无权限访问';
      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle missing query object', async () => {
      const req = {} as any;

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should handle null query object', async () => {
      const req = { query: null } as any;

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle valid ObjectId format evalId', async () => {
      const objectIdRequest = {
        query: {
          evalId: '507f1f77bcf86cd799439011' // valid ObjectId
        }
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(mockConfigResponse);

      const result = await handler(objectIdRequest);

      expect(result).toEqual(mockConfigResponse);
      expect(mockEvaluationSummaryService.getEvaluationSummaryConfig).toHaveBeenCalledWith(
        objectIdRequest.query.evalId,
        {
          req: objectIdRequest,
          authToken: true
        }
      );
    });

    it('should handle string evalId that is not ObjectId format', async () => {
      const stringIdRequest = {
        query: {
          evalId: 'test-evaluation-id'
        }
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(mockConfigResponse);

      const result = await handler(stringIdRequest);

      expect(result).toEqual(mockConfigResponse);
      expect(mockEvaluationSummaryService.getEvaluationSummaryConfig).toHaveBeenCalledWith(
        stringIdRequest.query.evalId,
        {
          req: stringIdRequest,
          authToken: true
        }
      );
    });

    it('should handle configuration with many metrics', async () => {
      const manyMetricsResponse = {
        caculateType: CaculateMethodEnum.median,
        caculateTypeName: 'Median',
        metricsConfig: Array.from({ length: 10 }, (_, index) => ({
          metricsId: `65f5b5b5b5b5b5b5b5b5b5b${index}`,
          metricsName: `指标${index + 1}`,
          thresholdValue: 70 + index * 5,
          weight: 0.1
        }))
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(manyMetricsResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(manyMetricsResponse);
      expect(result.metricsConfig).toHaveLength(10);
      expect(result.metricsConfig.every(metric => metric.weight === 0.1)).toBe(true);
    });

    it('should handle maximum threshold values', async () => {
      const maxThresholdResponse = {
        caculateType: CaculateMethodEnum.mean,
        caculateTypeName: 'Mean',
        metricsConfig: [
          {
            metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
            metricsName: '高要求指标',
            thresholdValue: 100,
            weight: 1.0
          }
        ]
      };

      mockEvaluationSummaryService.getEvaluationSummaryConfig.mockResolvedValue(maxThresholdResponse);

      const result = await handler(validRequest);

      expect(result).toEqual(maxThresholdResponse);
      expect(result.metricsConfig[0].thresholdValue).toBe(100);
    });
  });
});