import { Logger } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CacheService } from './cache.service';

Logger.overrideLogger(false);

const redis = { get: vi.fn(), set: vi.fn(), unlink: vi.fn() };
const cache = new CacheService(redis as never);

beforeEach(() => {
  vi.resetAllMocks();
  redis.set.mockResolvedValue('OK');
  redis.unlink.mockResolvedValue(1);
});

describe('CacheService', () => {
  it('returns the cached value without calling the loader', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    const load = vi.fn();
    await expect(cache.getOrSet('k', 60, load)).resolves.toEqual({ a: 1 });
    expect(redis.get).toHaveBeenCalledWith('ml:cache:k');
    expect(load).not.toHaveBeenCalled();
  });

  it('loads and stores on a miss with the TTL', async () => {
    redis.get.mockResolvedValue(null);
    await expect(cache.getOrSet('k', 60, async () => [1, 2])).resolves.toEqual([1, 2]);
    expect(redis.set).toHaveBeenCalledWith('ml:cache:k', '[1,2]', 'EX', 60);
  });

  it('serves from the loader when Redis is down', async () => {
    redis.get.mockRejectedValue(new Error('Connection is closed'));
    redis.set.mockRejectedValue(new Error('Connection is closed'));
    await expect(cache.getOrSet('k', 60, async () => 'fresh')).resolves.toBe('fresh');
  });

  it('deletes prefixed keys and swallows Redis errors', async () => {
    await cache.del(['a', 'b']);
    expect(redis.unlink).toHaveBeenCalledWith('ml:cache:a', 'ml:cache:b');
    redis.unlink.mockRejectedValue(new Error('down'));
    await expect(cache.del(['a'])).resolves.toBeUndefined();
  });
});
