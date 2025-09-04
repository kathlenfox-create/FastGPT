import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { CaculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';

// Create test handler by importing the API handler function
const createMockHandler = () => {
  const { EvaluationSummaryService } = require('@fastgpt/service/core/evaluation/summary');
  const handler = require('@/pages/api/core/evaluation/summary/config').default;
  
  return { handler, EvaluationSummaryService };
};

// Mock dependencies
vi.mock('@fastgpt/service/core/evaluation/summary', () => ({
  EvaluationSummaryService: {
    updateEvaluationSummaryConfig: vi.fn()
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

describe('/api/core/evaluation/summary/config', () => {
  let handler: any;
  let mockEvaluationSummaryService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = createMockHandler();
    handler = mocks.handler;
    mockEvaluationSummaryService = mocks.EvaluationSummaryService;
  });

  const validRequest = {
    body: {
      evalId: '65f5b5b5b5b5b5b5b5b5b5b5',
      metricsConfig: [
        {
          metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
          thresholdValue: 80,
          weight: 0.6,
          caculateType: CaculateMethodEnum.mean
        },
        {
          metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
          thresholdValue: 90,
          weight: 0.4,
          caculateType: CaculateMethodEnum.median
        }
      ]
    }
  } as ApiRequestProps<any>;

  describe('Parameter Validation', () => {
    it('should reject when evalId is missing', async () => {
      const req = {
        body: {
          metricsConfig: validRequest.body.metricsConfig
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when evalId is not a string', async () => {
      const req = {
        body: {
          evalId: 123,
          metricsConfig: validRequest.body.metricsConfig
        }
      };

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should reject when metricsConfig is missing', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig cannot be empty');
    });

    it('should reject when metricsConfig is not an array', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: 'invalid'
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig cannot be empty');
    });

    it('should reject when metricsConfig is empty array', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: []
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig cannot be empty');
    });

    it('should reject when metricsId is missing', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              thresholdValue: 80,
              weight: 0.6
            }
          ]
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig.metricsId is required');
    });

    it('should reject when thresholdValue is not a number', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 'invalid',
              weight: 0.6
            }
          ]
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig.thresholdValue must be a number');
    });

    it('should reject when thresholdValue is NaN', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: NaN,
              weight: 0.6
            }
          ]
        }
      };

      await expect(handler(req)).rejects.toEqual('metricsConfig.thresholdValue must be a number');
    });

    it('should require weight when 3 or more metrics are provided', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 80
              // weight missing
            },
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
              thresholdValue: 90,
              weight: 0.4
            },
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b8',
              thresholdValue: 85,
              weight: 0.3
            }
          ]
        }
      };

      await expect(handler(req)).rejects.toEqual(
        'When configuring 3 or more metrics, metricsConfig.weight must be a number'
      );
    });

    it('should allow missing weight when less than 3 metrics', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 80
              // weight missing - should be ok for < 3 metrics
            },
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
              thresholdValue: 90
            }
          ]
        }
      };

      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(req);
      expect(result).toEqual({ message: 'ok' });
    });
  });

  describe('Successful Operations', () => {
    it('should successfully update summary configuration', async () => {
      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(validRequest);

      expect(result).toEqual({ message: 'ok' });
      expect(mockEvaluationSummaryService.updateEvaluationSummaryConfig).toHaveBeenCalledWith(
        validRequest.body.evalId,
        validRequest.body.metricsConfig,
        {
          req: validRequest,
          authToken: true
        }
      );
    });

    it('should handle optional fields correctly', async () => {
      const reqWithOptionalFields = {
        body: {
          evalId: '65f5b5b5b5b5b5b5b5b5b5b5',
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 80,
              weight: 0.6,
              caculateType: CaculateMethodEnum.median
            }
          ]
        }
      };

      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(reqWithOptionalFields);

      expect(result).toEqual({ message: 'ok' });
      expect(mockEvaluationSummaryService.updateEvaluationSummaryConfig).toHaveBeenCalledWith(
        reqWithOptionalFields.body.evalId,
        reqWithOptionalFields.body.metricsConfig,
        {
          req: reqWithOptionalFields,
          authToken: true
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const serviceError = new Error('Database connection failed');
      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle service string errors', async () => {
      const serviceError = 'Evaluation not found';
      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockRejectedValue(serviceError);

      await expect(handler(validRequest)).rejects.toEqual(serviceError);
    });

    it('should handle missing request body', async () => {
      const req = {} as any;

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });

    it('should handle null request body', async () => {
      const req = { body: null } as any;

      await expect(handler(req)).rejects.toEqual('evalId is required');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly 3 metrics with all weights provided', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 80,
              weight: 0.3
            },
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b7',
              thresholdValue: 90,
              weight: 0.4
            },
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b8',
              thresholdValue: 85,
              weight: 0.3
            }
          ]
        }
      };

      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(req);
      expect(result).toEqual({ message: 'ok' });
    });

    it('should handle zero threshold values', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 0,
              weight: 1.0
            }
          ]
        }
      };

      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(req);
      expect(result).toEqual({ message: 'ok' });
    });

    it('should handle maximum threshold values', async () => {
      const req = {
        body: {
          evalId: validRequest.body.evalId,
          metricsConfig: [
            {
              metricsId: '65f5b5b5b5b5b5b5b5b5b5b6',
              thresholdValue: 100,
              weight: 1.0
            }
          ]
        }
      };

      mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockResolvedValue(undefined);

      const result = await handler(req);
      expect(result).toEqual({ message: 'ok' });
    });
  });
});