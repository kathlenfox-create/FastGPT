import { getGlobalRedisConnection } from './index';
import { addLog } from '../system/log';

export class DistributedLock {
  private redis = getGlobalRedisConnection();
  private static readonly LOCK_PREFIX = 'lock:';
  private static readonly DEFAULT_TTL = 30; // 默认锁超时时间30秒
  private static readonly DEFAULT_RETRY_DELAY = 100; // 默认重试间隔100ms
  private static readonly DEFAULT_MAX_RETRIES = 50; // 默认最大重试次数

  /**
   * 获取分布式锁
   * @param key 锁的唯一标识
   * @param ttl 锁的超时时间(秒)，防止死锁
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试间隔(毫秒)
   * @returns Promise<string | null> 返回锁的唯一值，如果获取失败返回null
   */
  async acquireLock(
    key: string,
    ttl: number = DistributedLock.DEFAULT_TTL,
    maxRetries: number = DistributedLock.DEFAULT_MAX_RETRIES,
    retryDelay: number = DistributedLock.DEFAULT_RETRY_DELAY
  ): Promise<string | null> {
    const lockKey = `${DistributedLock.LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36)}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 使用SET命令的NX和EX选项实现原子性获取锁
        const result = await this.redis.set(lockKey, lockValue, 'EX', ttl, 'NX');

        if (result === 'OK') {
          addLog.info('[DistributedLock] Lock acquired successfully', {
            key: lockKey,
            value: lockValue,
            ttl,
            attempt
          });
          return lockValue;
        }

        // 如果是最后一次尝试，不再等待
        if (attempt < maxRetries) {
          addLog.debug('[DistributedLock] Lock acquisition failed, retrying', {
            key: lockKey,
            attempt,
            maxRetries
          });
          await this.sleep(retryDelay);
        }
      } catch (error) {
        addLog.error('[DistributedLock] Error acquiring lock', {
          key: lockKey,
          attempt,
          error
        });

        if (attempt < maxRetries) {
          await this.sleep(retryDelay);
        }
      }
    }

    addLog.warn('[DistributedLock] Failed to acquire lock after max retries', {
      key: lockKey,
      maxRetries
    });
    return null;
  }

  /**
   * 释放分布式锁
   * @param key 锁的唯一标识
   * @param lockValue 获取锁时返回的唯一值
   * @returns Promise<boolean> 释放成功返回true，失败返回false
   */
  async releaseLock(key: string, lockValue: string): Promise<boolean> {
    const lockKey = `${DistributedLock.LOCK_PREFIX}${key}`;

    try {
      // 使用Lua脚本确保只能释放自己持有的锁
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey, lockValue);

      if (result === 1) {
        addLog.info('[DistributedLock] Lock released successfully', {
          key: lockKey,
          value: lockValue
        });
        return true;
      } else {
        addLog.warn('[DistributedLock] Failed to release lock - lock not owned or expired', {
          key: lockKey,
          value: lockValue
        });
        return false;
      }
    } catch (error) {
      addLog.error('[DistributedLock] Error releasing lock', {
        key: lockKey,
        value: lockValue,
        error
      });
      return false;
    }
  }

  /**
   * 使用分布式锁执行函数
   * @param key 锁的唯一标识
   * @param fn 需要在锁保护下执行的函数
   * @param ttl 锁的超时时间(秒)
   * @param maxRetries 最大重试次数
   * @param retryDelay 重试间隔(毫秒)
   * @param autoRenew 是否自动续锁，默认true
   * @returns Promise<T> 返回函数执行结果
   */
  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = DistributedLock.DEFAULT_TTL,
    maxRetries: number = DistributedLock.DEFAULT_MAX_RETRIES,
    retryDelay: number = DistributedLock.DEFAULT_RETRY_DELAY,
    autoRenew: boolean = true
  ): Promise<T> {
    const lockValue = await this.acquireLock(key, ttl, maxRetries, retryDelay);

    if (!lockValue) {
      throw new Error(`Failed to acquire distributed lock for key: ${key}`);
    }

    let renewInterval: NodeJS.Timeout | null = null;

    try {
      addLog.info('[DistributedLock] Executing function with lock', { key, ttl, autoRenew });

      // 如果启用自动续锁，设置定时器
      if (autoRenew) {
        const renewIntervalMs = Math.max(1000, (ttl * 1000) / 3); // 每1/3 TTL时间续锁一次，最少1秒
        renewInterval = setInterval(async () => {
          try {
            const renewed = await this.extendLock(key, lockValue, ttl);
            if (renewed) {
              addLog.debug('[DistributedLock] Lock renewed successfully', { key, ttl });
            } else {
              addLog.warn(
                '[DistributedLock] Failed to renew lock - may have been taken by another process',
                { key }
              );
            }
          } catch (error) {
            addLog.error('[DistributedLock] Error renewing lock', { key, error });
          }
        }, renewIntervalMs);
      }

      const result = await fn();
      addLog.info('[DistributedLock] Function execution completed successfully', { key });
      return result;
    } finally {
      // 停止自动续锁
      if (renewInterval) {
        clearInterval(renewInterval);
      }

      // 确保锁总是被释放
      await this.releaseLock(key, lockValue);
    }
  }

  /**
   * 延长锁的超时时间
   * @param key 锁的唯一标识
   * @param lockValue 获取锁时返回的唯一值
   * @param ttl 新的超时时间(秒)
   * @returns Promise<boolean> 延长成功返回true，失败返回false
   */
  async extendLock(key: string, lockValue: string, ttl: number): Promise<boolean> {
    const lockKey = `${DistributedLock.LOCK_PREFIX}${key}`;

    try {
      // 使用Lua脚本确保只能延长自己持有的锁
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("EXPIRE", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey, lockValue, ttl);

      if (result === 1) {
        addLog.info('[DistributedLock] Lock extended successfully', {
          key: lockKey,
          value: lockValue,
          ttl
        });
        return true;
      } else {
        addLog.warn('[DistributedLock] Failed to extend lock - lock not owned or expired', {
          key: lockKey,
          value: lockValue
        });
        return false;
      }
    } catch (error) {
      addLog.error('[DistributedLock] Error extending lock', {
        key: lockKey,
        value: lockValue,
        ttl,
        error
      });
      return false;
    }
  }

  /**
   * 检查锁是否存在
   * @param key 锁的唯一标识
   * @returns Promise<boolean> 锁存在返回true，不存在返回false
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = `${DistributedLock.LOCK_PREFIX}${key}`;

    try {
      const result = await this.redis.exists(lockKey);
      return result === 1;
    } catch (error) {
      addLog.error('[DistributedLock] Error checking lock existence', {
        key: lockKey,
        error
      });
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * 读写锁实现
 * 支持多个读操作并发，但写操作独占
 */
export class ReadWriteLock {
  private redis = getGlobalRedisConnection();
  private static readonly READER_COUNT_PREFIX = 'rw_lock_readers:';
  private static readonly WRITER_LOCK_PREFIX = 'rw_lock_writer:';

  /**
   * 获取读锁
   */
  async acquireReadLock(key: string, ttl: number = 30): Promise<string | null> {
    const readerCountKey = `${ReadWriteLock.READER_COUNT_PREFIX}${key}`;
    const writerLockKey = `${ReadWriteLock.WRITER_LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36)}`;

    try {
      // Lua脚本：原子性地检查写锁并增加读者计数
      const luaScript = `
        -- 检查是否有写锁
        if redis.call("EXISTS", KEYS[2]) == 1 then
          return nil
        end

        -- 增加读者计数
        local count = redis.call("INCR", KEYS[1])
        redis.call("EXPIRE", KEYS[1], ARGV[2])

        -- 将读锁值存储起来
        redis.call("SADD", KEYS[1] .. ":values", ARGV[1])
        redis.call("EXPIRE", KEYS[1] .. ":values", ARGV[2])

        return ARGV[1]
      `;

      const result = await this.redis.eval(
        luaScript,
        2,
        readerCountKey,
        writerLockKey,
        lockValue,
        ttl
      );

      if (result) {
        addLog.debug('[ReadWriteLock] Read lock acquired', { key, lockValue });
        return lockValue;
      }

      return null;
    } catch (error) {
      addLog.error('[ReadWriteLock] Error acquiring read lock', { key, error });
      return null;
    }
  }

  /**
   * 释放读锁
   */
  async releaseReadLock(key: string, lockValue: string): Promise<boolean> {
    const readerCountKey = `${ReadWriteLock.READER_COUNT_PREFIX}${key}`;

    try {
      const luaScript = `
        -- 检查锁值是否存在
        if redis.call("SISMEMBER", KEYS[1] .. ":values", ARGV[1]) == 0 then
          return 0
        end

        -- 移除锁值并减少计数
        redis.call("SREM", KEYS[1] .. ":values", ARGV[1])
        local count = redis.call("DECR", KEYS[1])

        -- 如果计数为0，删除key
        if count <= 0 then
          redis.call("DEL", KEYS[1])
          redis.call("DEL", KEYS[1] .. ":values")
        end

        return 1
      `;

      const result = await this.redis.eval(luaScript, 1, readerCountKey, lockValue);

      if (result === 1) {
        addLog.debug('[ReadWriteLock] Read lock released', { key, lockValue });
        return true;
      }

      return false;
    } catch (error) {
      addLog.error('[ReadWriteLock] Error releasing read lock', { key, lockValue, error });
      return false;
    }
  }

  /**
   * 获取写锁
   */
  async acquireWriteLock(key: string, ttl: number = 30): Promise<string | null> {
    const readerCountKey = `${ReadWriteLock.READER_COUNT_PREFIX}${key}`;
    const writerLockKey = `${ReadWriteLock.WRITER_LOCK_PREFIX}${key}`;
    const lockValue = `${Date.now()}-${Math.random().toString(36)}`;

    try {
      const luaScript = `
        -- 检查是否有写锁或读锁
        if redis.call("EXISTS", KEYS[2]) == 1 then
          return nil
        end

        if redis.call("EXISTS", KEYS[1]) == 1 then
          return nil
        end

        -- 设置写锁
        return redis.call("SET", KEYS[2], ARGV[1], "EX", ARGV[2], "NX")
      `;

      const result = await this.redis.eval(
        luaScript,
        2,
        readerCountKey,
        writerLockKey,
        lockValue,
        ttl
      );

      if (result === 'OK') {
        addLog.debug('[ReadWriteLock] Write lock acquired', { key, lockValue });
        return lockValue;
      }

      return null;
    } catch (error) {
      addLog.error('[ReadWriteLock] Error acquiring write lock', { key, error });
      return null;
    }
  }

  /**
   * 释放写锁
   */
  async releaseWriteLock(key: string, lockValue: string): Promise<boolean> {
    const writerLockKey = `${ReadWriteLock.WRITER_LOCK_PREFIX}${key}`;

    try {
      const luaScript = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.redis.eval(luaScript, 1, writerLockKey, lockValue);

      if (result === 1) {
        addLog.debug('[ReadWriteLock] Write lock released', { key, lockValue });
        return true;
      }

      return false;
    } catch (error) {
      addLog.error('[ReadWriteLock] Error releasing write lock', { key, lockValue, error });
      return false;
    }
  }

  /**
   * 使用读锁执行函数
   */
  async withReadLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 30,
    maxRetries: number = 20,
    retryDelay: number = 100
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const lockValue = await this.acquireReadLock(key, ttl);

      if (lockValue) {
        try {
          return await fn();
        } finally {
          await this.releaseReadLock(key, lockValue);
        }
      }

      if (attempt < maxRetries) {
        await this.sleep(retryDelay);
      }
    }

    throw new Error(`Failed to acquire read lock for key: ${key}`);
  }

  /**
   * 使用写锁执行函数
   */
  async withWriteLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = 60,
    maxRetries: number = 30,
    retryDelay: number = 200
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const lockValue = await this.acquireWriteLock(key, ttl);

      if (lockValue) {
        try {
          return await fn();
        } finally {
          await this.releaseWriteLock(key, lockValue);
        }
      }

      if (attempt < maxRetries) {
        await this.sleep(retryDelay);
      }
    }

    throw new Error(`Failed to acquire write lock for key: ${key}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// 导出单例实例
export const distributedLock = new DistributedLock();
export const readWriteLock = new ReadWriteLock();
