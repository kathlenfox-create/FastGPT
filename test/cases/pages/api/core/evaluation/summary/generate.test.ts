import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import type {
  GenerateSummaryParams,
  GenerateSummaryResponse
} from '@fastgpt/global/core/evaluation/type';

// Create test handler by importing the API handler function
const createMockHandler = () => {
  const { EvaluationSummaryService } = require('@fastgpt/service/core/evaluation/summary');
  const handler = require('@/pages/api/core/evaluation/summary/generate').default;
  
  return { handler, EvaluationSummaryService };
};

// Mock dependencies
vi.mock('@fastgpt/service/core/evaluation/summary', () => ({
  EvaluationSummaryService: {
    generateSummaryReports: vi.fn()
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

describe('/api/core/evaluation/summary/generate', () => {
  let handler: any;
  let mockEvaluationSummaryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockHandler();
    handler = mocks.handler;
    mockEvaluationSummaryService = mocks.EvaluationSummaryService;
  });

  const validRequest: ApiRequestProps<GenerateSummaryParams> = {
    body: {
      evalId: '65f5b5b5b5b5b5b5b5b5b5b5',
      metricsIds: [
        '65f5b5b5b5b5b5b5b5b5b5b6',
        '65f5b5b5b5b5b5b5b5b5b5b7'
      ]
    }
  } as any;

  const expectedResponse: GenerateSummaryResponse = {
    success: true,
    message: 'Report generation task started'
  };

  describe('Parameter Validation', () => {
    it('should reject when evalId is missing', async () => {
      const req = {
        body: {
          metricsIds: validRequest.body.metricsIds
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when evalId is null', async () => {
      const req = {
        body: {
          evalId: null,
          metricsIds: validRequest.body.metricsIds
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when evalId is empty string', async () => {
      const req = {
        body: {
          evalId: '',
          metricsIds: validRequest.body.metricsIds
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when metricsIds is missing', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when metricsIds is null', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: null
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when metricsIds is not an array', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: 'not-an-array'
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should reject when metricsIds is empty array', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: []
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should handle missing request body', async () => {
      const req = {} as any;

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });

    it('should handle null request body', async () => {
      const req = { body: null } as any;

      await expect(handler(req)).rejects.toEqual(
        'Evaluation task ID and metrics ID array are required'
      );
    });
  });

  describe('Successful Operations', () => {
    it('should successfully start summary report generation', async () => {
      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(validRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledWith(
        validRequest.body.evalId,
        validRequest.body.metricsIds,
        {
          req: validRequest,
          authToken: true
        }
      );
    });

    it('should handle single metric generation', async () => {
      const singleMetricRequest = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: ['65f5b5b5b5b5b5b5b5b5b5b6']
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(singleMetricRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledWith(
        singleMetricRequest.body.evalId,
        singleMetricRequest.body.metricsIds,
        {
          req: singleMetricRequest,
          authToken: true
        }
      );
    });

    it('should handle multiple metrics generation', async () => {
      const multipleMetricsRequest = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: [
            '65f5b5b5b5b5b5b5b5b5b5b6',
            '65f5b5b5b5b5b5b5b5b5b5b7',
            '65f5b5b5b5b5b5b5b5b5b5b8',
            '65f5b5b5b5b5b5b5b5b5b5b9'
          ]
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(multipleMetricsRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledWith(
        multipleMetricsRequest.body.evalId,
        multipleMetricsRequest.body.metricsIds,
        {
          req: multipleMetricsRequest,
          authToken: true
        }
      );
      expect(multipleMetricsRequest.body.metricsIds).toHaveLength(4);
    });

    it('should handle valid ObjectId format inputs', async () => {
      const objectIdRequest = {
        body: {
          evalId: '507f1f77bcf86cd799439011', // valid ObjectId
          metricsIds: [
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439013'
          ]
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(objectIdRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledWith(
        objectIdRequest.body.evalId,
        objectIdRequest.body.metricsIds,
        {
          req: objectIdRequest,
          authToken: true
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle evaluation not found error', async () => {
      const serviceError = '评估任务不存在或无权限访问';
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle permission denied error', async () => {
      const serviceError = new Error('Permission denied');
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle metrics not found error', async () => {
      const serviceError = '没有找到有效的指标';
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle metrics ownership validation error', async () => {
      const serviceError = 'metricsId 65f5b5b5b5b5b5b5b5b5b5b6 不属于该评估任务';
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle insufficient balance error', async () => {
      const serviceError = new Error('AI Points balance insufficient');
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle LLM service error', async () => {
      const serviceError = 'LLM service is temporarily unavailable';
      mockEvaluationSummaryService.generateSummaryReports.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long metrics ID array', async () => {
      const longMetricsRequest = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: Array.from({ length: 50 }, (_, i) => 
            `65f5b5b5b5b5b5b5b5b5b5${i.toString().padStart(2, '0')}`
          )
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(longMetricsRequest);

      expect(result).toEqual(expectedResponse);
      expect(longMetricsRequest.body.metricsIds).toHaveLength(50);
    });

    it('should handle duplicate metrics IDs', async () => {
      const duplicateMetricsRequest = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: [
            '65f5b5b5b5b5b5b5b5b5b5b6',
            '65f5b5b5b5b5b5b5b5b5b5b6', // duplicate
            '65f5b5b5b5b5b5b5b5b5b5b7'
          ]
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(duplicateMetricsRequest);

      expect(result).toEqual(expectedResponse);
      expect(duplicateMetricsRequest.body.metricsIds).toHaveLength(3);
    });

    it('should handle mixed valid and invalid metric IDs format', async () => {
      const mixedFormatRequest = {
        body: {
          evalId: validRequest.body.evalId,
          metricsIds: [
            '65f5b5b5b5b5b5b5b5b5b5b6', // valid ObjectId
            'metric-123',                // string ID
            'another-metric-id'          // another string ID
          ]
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(mixedFormatRequest);

      expect(result).toEqual(expectedResponse);
      expect(mixedFormatRequest.body.metricsIds).toHaveLength(3);
    });

    it('should handle string evalId that is not ObjectId format', async () => {
      const stringIdRequest = {
        body: {
          evalId: 'test-evaluation-task',
          metricsIds: validRequest.body.metricsIds
        }
      };

      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(stringIdRequest);

      expect(result).toEqual(expectedResponse);
      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledWith(
        stringIdRequest.body.evalId,
        stringIdRequest.body.metricsIds,
        {
          req: stringIdRequest,
          authToken: true
        }
      );
    });

    it('should handle service promise resolution edge case', async () => {
      // Test when service returns undefined (void promise)
      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(validRequest);

      expect(result).toEqual(expectedResponse);
    });

    it('should handle concurrent generation requests', async () => {
      // Simulate concurrent requests by calling handler multiple times
      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const promises = Array.from({ length: 5 }, () => handler({
        body: {
          evalId: `eval-${Math.random()}`,
          metricsIds: [`metric-${Math.random()}`]
        }
      }));

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toEqual(expectedResponse);
      });

      expect(mockEvaluationSummaryService.generateSummaryReports).toHaveBeenCalledTimes(5);
    });
  });

  describe('Response Format Validation', () => {
    it('should return consistent response structure', async () => {
      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue(undefined);

      const result = await handler(validRequest);

      expect(result).toEqual(expect.objectContaining({
        success: expect.any(Boolean),
        message: expect.any(String)
      }));
      
      expect(result.success).toBe(true);
      expect(typeof result.message).toBe('string');
    });

    it('should maintain response structure even on service changes', async () => {
      // Test that API maintains consistent response regardless of service implementation
      mockEvaluationSummaryService.generateSummaryReports.mockResolvedValue('some-return-value');

      const result = await handler(validRequest);

      expect(result).toEqual(expectedResponse);
      expect(Object.keys(result)).toEqual(['success', 'message']);
    });
  });
});