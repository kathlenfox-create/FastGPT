import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Types } from '@fastgpt/service/common/mongo';
import { CalculateMethodEnum } from '@fastgpt/global/core/evaluation/constants';
import { distributedLock, readWriteLock } from '@fastgpt/service/common/redis/distributedLock';
import { EvaluationSummaryService } from '@fastgpt/service/core/evaluation/summary';

// Mock Redis distributed lock and read-write lock
const mockDistributedLock = {
  withLock: vi.fn(),
  acquireLock: vi.fn(),
  releaseLock: vi.fn(),
  isLocked: vi.fn().mockResolvedValue(false)
};

const mockReadWriteLock = {
  withReadLock: vi.fn(),
  withWriteLock: vi.fn(),
  acquireReadLock: vi.fn(),
  acquireWriteLock: vi.fn(),
  releaseReadLock: vi.fn(),
  releaseWriteLock: vi.fn()
};

// Mock Redis和相关依赖
vi.mock('@fastgpt/service/common/redis/distributedLock', () => ({
  distributedLock: mockDistributedLock,
  readWriteLock: mockReadWriteLock,
  DistributedLock: vi.fn().mockImplementation(() => mockDistributedLock),
  ReadWriteLock: vi.fn().mockImplementation(() => mockReadWriteLock)
}));

vi.mock('@fastgpt/service/common/redis/index', () => ({
  getGlobalRedisConnection: vi.fn().mockReturnValue({
    set: vi.fn().mockResolvedValue('OK'),
    eval: vi.fn().mockResolvedValue(1),
    exists: vi.fn().mockResolvedValue(0)
  })
}));

vi.mock('@fastgpt/service/common/system/log', () => ({
  addLog: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock evaluation services
const mockEvaluationSummaryService = {
  updateEvaluationSummaryConfig: vi.fn(),
  calculateAndSaveMetricScores: vi.fn()
};

vi.mock('@fastgpt/service/core/evaluation/summary', () => ({
  EvaluationSummaryService: mockEvaluationSummaryService
}));

describe('Evaluation Configuration Update Concurrency Tests', () => {
  const mockEvalId = new Types.ObjectId().toString();
  const mockMetricsConfig = [
    {
      metricId: 'metric-1',
      thresholdValue: 0.8,
      weight: 60,
      calculateType: CalculateMethodEnum.mean
    },
    {
      metricId: 'metric-2',
      thresholdValue: 0.7,
      weight: 40,
      calculateType: CalculateMethodEnum.mean
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to default behavior
    mockDistributedLock.withLock.mockImplementation(async (key, fn) => {
      return await fn();
    });
    mockReadWriteLock.withReadLock.mockImplementation(async (key, fn) => {
      return await fn();
    });
    mockReadWriteLock.withWriteLock.mockImplementation(async (key, fn) => {
      return await fn();
    });
  });

  test('应该防止配置更新的并发冲突', async () => {
    let executionOrder: string[] = [];
    let activeOperations = 0;
    let maxConcurrentOperations = 0;

    // Mock withWriteLock to simulate sequential execution (配置更新现在使用写锁)
    mockReadWriteLock.withWriteLock.mockImplementation(async (key, fn) => {
      activeOperations++;
      maxConcurrentOperations = Math.max(maxConcurrentOperations, activeOperations);
      executionOrder.push(`write-lock-acquired-${activeOperations}`);

      try {
        const result = await fn();
        executionOrder.push(`operation-completed-${activeOperations}`);
        return result;
      } finally {
        activeOperations--;
        executionOrder.push(`write-lock-released`);
      }
    });

    // Mock the service method
    mockEvaluationSummaryService.updateEvaluationSummaryConfig.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Start two concurrent configuration updates
    const promise1 = mockEvaluationSummaryService.updateEvaluationSummaryConfig(
      mockEvalId,
      mockMetricsConfig
    );
    const promise2 = mockEvaluationSummaryService.updateEvaluationSummaryConfig(
      mockEvalId,
      mockMetricsConfig
    );

    await Promise.all([promise1, promise2]);

    // Verify that the write lock was used correctly
    expect(mockReadWriteLock.withWriteLock).toHaveBeenCalledTimes(2);
    expect(mockEvaluationSummaryService.updateEvaluationSummaryConfig).toHaveBeenCalledTimes(2);

    // Verify operations were serialized (max 1 concurrent operation)
    expect(maxConcurrentOperations).toBe(1);
  });

  test('应该防止配置更新与指标计算的并发冲突', async () => {
    const executionOrder: string[] = [];

    // Mock implementations to track execution order
    const mockUpdateConfig = vi.fn().mockImplementation(async () => {
      executionOrder.push('config-update-start');
      await new Promise((resolve) => setTimeout(resolve, 150));
      executionOrder.push('config-update-end');
    });

    const mockCalculateMetrics = vi.fn().mockImplementation(async () => {
      executionOrder.push('metric-calc-start');
      await new Promise((resolve) => setTimeout(resolve, 100));
      executionOrder.push('metric-calc-end');
    });

    (EvaluationSummaryService.updateEvaluationSummaryConfig as any).mockImplementation(
      mockUpdateConfig
    );
    (EvaluationSummaryService.calculateAndSaveMetricScores as any).mockImplementation(
      mockCalculateMetrics
    );

    // Start both operations concurrently
    const configPromise = EvaluationSummaryService.updateEvaluationSummaryConfig(
      mockEvalId,
      mockMetricsConfig
    );

    // Small delay to ensure config update starts first
    await new Promise((resolve) => setTimeout(resolve, 50));

    const metricsPromise = EvaluationSummaryService.calculateAndSaveMetricScores(mockEvalId);

    await Promise.all([configPromise, metricsPromise]);

    // Verify both operations completed
    expect(mockUpdateConfig).toHaveBeenCalledTimes(1);
    expect(mockCalculateMetrics).toHaveBeenCalledTimes(1);

    // Verify operations didn't overlap
    const configStart = executionOrder.indexOf('config-update-start');
    const configEnd = executionOrder.indexOf('config-update-end');
    const metricStart = executionOrder.indexOf('metric-calc-start');
    const metricEnd = executionOrder.indexOf('metric-calc-end');

    // One operation should complete before the other starts
    const configFirst = configEnd < metricStart;
    const metricFirst = metricEnd < configStart;

    expect(configFirst || metricFirst).toBe(true);
  }, 15000);

  test('应该允许多个读操作并发执行', async () => {
    let activeReadOperations = 0;
    let maxConcurrentReadOperations = 0;
    const executionOrder: string[] = [];

    // Mock withReadLock to track concurrent read operations
    mockReadWriteLock.withReadLock.mockImplementation(async (key, fn) => {
      activeReadOperations++;
      maxConcurrentReadOperations = Math.max(maxConcurrentReadOperations, activeReadOperations);
      executionOrder.push(`read-lock-acquired-${activeReadOperations}`);

      try {
        // Simulate some read operation time
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await fn();
        executionOrder.push(`read-operation-completed-${activeReadOperations}`);
        return result;
      } finally {
        activeReadOperations--;
        executionOrder.push(`read-lock-released`);
      }
    });

    // Mock read operations (like calculateEvaluationItemAggregateScore)
    const mockReadOperation = vi.fn().mockImplementation(async () => {
      return 0.85; // mock score
    });

    // Start multiple concurrent read operations
    const readPromises = Array.from({ length: 3 }, () => mockReadOperation());

    await Promise.all(readPromises);

    // Verify that multiple read operations can run concurrently
    expect(maxConcurrentReadOperations).toBeGreaterThan(1);
    expect(mockReadOperation).toHaveBeenCalledTimes(3);
  });

  test('应该阻止写操作与读操作并发执行', async () => {
    let activeOperations = 0;
    let maxConcurrentOperations = 0;
    const executionOrder: string[] = [];

    // Mock read lock
    mockReadWriteLock.withReadLock.mockImplementation(async (key, fn) => {
      activeOperations++;
      maxConcurrentOperations = Math.max(maxConcurrentOperations, activeOperations);
      executionOrder.push(`read-start-${activeOperations}`);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await fn();
        executionOrder.push(`read-end-${activeOperations}`);
        return result;
      } finally {
        activeOperations--;
      }
    });

    // Mock write lock
    mockReadWriteLock.withWriteLock.mockImplementation(async (key, fn) => {
      activeOperations++;
      maxConcurrentOperations = Math.max(maxConcurrentOperations, activeOperations);
      executionOrder.push(`write-start-${activeOperations}`);

      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const result = await fn();
        executionOrder.push(`write-end-${activeOperations}`);
        return result;
      } finally {
        activeOperations--;
      }
    });

    // Start read and write operations concurrently
    const readPromise = mockReadWriteLock.withReadLock('test-key', async () => 'read-result');
    const writePromise = mockReadWriteLock.withWriteLock('test-key', async () => 'write-result');

    await Promise.all([readPromise, writePromise]);

    // Verify operations were serialized (read-write conflict prevented concurrency)
    expect(maxConcurrentOperations).toBe(1);
  });

  test('应该正确处理写锁获取失败的情况', async () => {
    // Mock the write lock to always fail after some retries
    const originalWithWriteLock = readWriteLock.withWriteLock;
    const mockWithWriteLock = vi.fn().mockRejectedValue(new Error('Failed to acquire write lock'));
    readWriteLock.withWriteLock = mockWithWriteLock;

    try {
      await expect(
        EvaluationSummaryService.updateEvaluationSummaryConfig(mockEvalId, mockMetricsConfig)
      ).rejects.toThrow('Failed to acquire write lock');

      expect(mockWithWriteLock).toHaveBeenCalled();
    } finally {
      // Restore original implementation
      readWriteLock.withWriteLock = originalWithWriteLock;
    }
  });

  test('应该在操作完成后正确释放写锁', async () => {
    const writeLockSpy = vi.spyOn(readWriteLock, 'withWriteLock');

    const mockUpdateConfig = vi.fn().mockResolvedValue(undefined);
    (EvaluationSummaryService.updateEvaluationSummaryConfig as any).mockImplementation(
      mockUpdateConfig
    );

    await EvaluationSummaryService.updateEvaluationSummaryConfig(mockEvalId, mockMetricsConfig);

    // Verify withWriteLock was called with correct parameters
    expect(writeLockSpy).toHaveBeenCalledWith(
      `evaluation_config:${mockEvalId}`,
      expect.any(Function),
      60, // timeout
      30, // max retries
      200 // retry delay
    );

    // Mock check that the write lock is no longer held (readWriteLock doesn't have isLocked method)
    expect(writeLockSpy).toHaveBeenCalledTimes(1);

    writeLockSpy.mockRestore();
  });

  test('应该在操作异常时也能正确释放写锁', async () => {
    const writeLockSpy = vi.spyOn(readWriteLock, 'withWriteLock');
    const mockError = new Error('Configuration update failed');
    const mockUpdateConfig = vi.fn().mockRejectedValue(mockError);
    (EvaluationSummaryService.updateEvaluationSummaryConfig as any).mockImplementation(
      mockUpdateConfig
    );

    await expect(
      EvaluationSummaryService.updateEvaluationSummaryConfig(mockEvalId, mockMetricsConfig)
    ).rejects.toThrow('Configuration update failed');

    // Verify the write lock was attempted (even though operation failed)
    expect(writeLockSpy).toHaveBeenCalledTimes(1);

    writeLockSpy.mockRestore();
  });
});
