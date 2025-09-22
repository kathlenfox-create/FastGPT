import { describe, test, expect, vi, beforeEach } from 'vitest';

// 创建一个简单的分布式锁模拟器来测试并发控制
class MockDistributedLock {
  private locks = new Map<string, boolean>();

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 模拟获取锁的过程
    while (this.locks.get(key)) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    this.locks.set(key, true);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
    }
  }
}

describe('分布式锁并发控制测试', () => {
  let mockLock: MockDistributedLock;
  let executionLog: string[];

  beforeEach(() => {
    mockLock = new MockDistributedLock();
    executionLog = [];
  });

  test('应该防止相同key的并发操作', async () => {
    const key = 'test-key';
    let activeOperations = 0;
    let maxConcurrentOperations = 0;

    const operation = async (id: string) => {
      return await mockLock.withLock(key, async () => {
        activeOperations++;
        maxConcurrentOperations = Math.max(maxConcurrentOperations, activeOperations);

        executionLog.push(`operation-${id}-start`);

        // 模拟一些处理时间
        await new Promise((resolve) => setTimeout(resolve, 50));

        executionLog.push(`operation-${id}-end`);

        activeOperations--;
        return `result-${id}`;
      });
    };

    // 启动多个并发操作
    const promises = [operation('1'), operation('2'), operation('3')];

    const results = await Promise.all(promises);

    // 验证结果
    expect(results).toEqual(['result-1', 'result-2', 'result-3']);

    // 验证没有并发执行（最大并发数应该是1）
    expect(maxConcurrentOperations).toBe(1);

    // 验证执行顺序是串行的
    expect(executionLog).toEqual([
      'operation-1-start',
      'operation-1-end',
      'operation-2-start',
      'operation-2-end',
      'operation-3-start',
      'operation-3-end'
    ]);
  });

  test('不同key的操作应该可以并发执行', async () => {
    let maxConcurrentOperations = 0;
    let currentOperations = 0;

    const operation = async (key: string, id: string) => {
      return await mockLock.withLock(key, async () => {
        currentOperations++;
        maxConcurrentOperations = Math.max(maxConcurrentOperations, currentOperations);

        executionLog.push(`operation-${id}-start`);

        await new Promise((resolve) => setTimeout(resolve, 30));

        executionLog.push(`operation-${id}-end`);

        currentOperations--;
        return `result-${id}`;
      });
    };

    // 使用不同的key启动操作
    const promises = [operation('key1', '1'), operation('key2', '2'), operation('key3', '3')];

    const results = await Promise.all(promises);

    expect(results).toEqual(['result-1', 'result-2', 'result-3']);

    // 因为使用了不同的key，应该可以并发执行
    expect(maxConcurrentOperations).toBeGreaterThan(1);
  });

  test('模拟评估配置更新的并发场景', async () => {
    const evalId = 'eval-123';
    let configUpdates = 0;
    let metricCalculations = 0;

    const updateConfig = async () => {
      return await mockLock.withLock(`config-update:${evalId}`, async () => {
        configUpdates++;
        executionLog.push(`config-update-${configUpdates}-start`);

        // 模拟配置更新和重新计算
        await new Promise((resolve) => setTimeout(resolve, 100));

        executionLog.push(`config-update-${configUpdates}-end`);
        return `config-updated-${configUpdates}`;
      });
    };

    const calculateMetrics = async () => {
      return await mockLock.withLock(`metric-calc:${evalId}`, async () => {
        metricCalculations++;
        executionLog.push(`metric-calc-${metricCalculations}-start`);

        // 模拟指标计算
        await new Promise((resolve) => setTimeout(resolve, 50));

        executionLog.push(`metric-calc-${metricCalculations}-end`);
        return `metrics-calculated-${metricCalculations}`;
      });
    };

    // 模拟并发的配置更新和指标计算
    const promises = [updateConfig(), calculateMetrics(), updateConfig(), calculateMetrics()];

    const results = await Promise.all(promises);

    // 验证所有操作都完成了
    expect(results).toHaveLength(4);
    expect(configUpdates).toBe(2);
    expect(metricCalculations).toBe(2);

    // 验证相同类型的操作是串行的，不同类型的可以并发
    const configStartTimes = executionLog
      .map((log, index) => ({ log, index }))
      .filter(({ log }) => log.includes('config-update') && log.includes('start'))
      .map(({ index }) => index);

    const configEndTimes = executionLog
      .map((log, index) => ({ log, index }))
      .filter(({ log }) => log.includes('config-update') && log.includes('end'))
      .map(({ index }) => index);

    // 第一个配置更新应该在第二个开始之前结束
    expect(configEndTimes[0]).toBeLessThan(configStartTimes[1]);
  });
});
