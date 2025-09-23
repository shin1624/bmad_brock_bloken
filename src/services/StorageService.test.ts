import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  IndexedDBStorage,
  LocalStorageAdapter,
  MemoryStorage,
  StorageFactory,
  EnhancedStorageService,
} from './StorageService';
import { Level, LEVEL_FORMAT_VERSION } from '../types/editor.types';

// Mock IndexedDB for testing
const mockIndexedDB = () => {
  const databases = new Map();
  
  return {
    open: vi.fn((name: string, version: number) => {
      const db = {
        objectStoreNames: {
          contains: vi.fn(() => false),
        },
        createObjectStore: vi.fn(),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: null,
            })),
            put: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
            delete: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
            clear: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
            })),
            getAllKeys: vi.fn(() => ({
              onsuccess: null,
              onerror: null,
              result: [],
            })),
          })),
        })),
        close: vi.fn(),
      };

      const request = {
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
        result: db,
      };

      setTimeout(() => {
        if (request.onsuccess) request.onsuccess();
      }, 0);

      return request;
    }),
    deleteDatabase: vi.fn(),
  };
};

describe('Storage Adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('LocalStorageAdapter', () => {
    let adapter: LocalStorageAdapter;

    beforeEach(() => {
      adapter = new LocalStorageAdapter();
    });

    it('should check availability', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should store and retrieve data', async () => {
      await adapter.set('test-key', 'test-value');
      const value = await adapter.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should remove data', async () => {
      await adapter.set('test-key', 'test-value');
      await adapter.remove('test-key');
      const value = await adapter.get('test-key');
      expect(value).toBeNull();
    });

    it('should clear all prefixed data', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      // Add non-prefixed item
      localStorage.setItem('other-key', 'other-value');

      await adapter.clear();

      const value1 = await adapter.get('key1');
      const value2 = await adapter.get('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(localStorage.getItem('other-key')).toBe('other-value');
    });

    it('should list keys with prefix', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      localStorage.setItem('other-key', 'other-value');

      const keys = await adapter.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('other-key');
    });

    it('should handle quota exceeded', async () => {
      // Simulate quota exceeded by filling storage
      const largeData = 'x'.repeat(10 * 1024 * 1024); // 10MB
      
      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      await expect(adapter.set('large', largeData)).rejects.toThrow('Insufficient storage space');

      localStorage.setItem = originalSetItem;
    });

    it('should estimate usage', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const usage = await adapter.getUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.quota).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe('MemoryStorage', () => {
    let adapter: MemoryStorage;

    beforeEach(() => {
      adapter = new MemoryStorage();
    });

    it('should always be available', () => {
      expect(adapter.isAvailable()).toBe(true);
    });

    it('should store and retrieve data', async () => {
      await adapter.set('test-key', 'test-value');
      const value = await adapter.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should remove data', async () => {
      await adapter.set('test-key', 'test-value');
      await adapter.remove('test-key');
      const value = await adapter.get('test-key');
      expect(value).toBeNull();
    });

    it('should clear all data', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');
      await adapter.clear();

      const value1 = await adapter.get('key1');
      const value2 = await adapter.get('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should list all keys', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const keys = await adapter.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    it('should calculate usage', async () => {
      await adapter.set('key1', 'value1');
      await adapter.set('key2', 'value2');

      const usage = await adapter.getUsage();
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.quota).toBe(50 * 1024 * 1024); // 50MB
    });
  });

  describe('StorageFactory', () => {
    it('should be a singleton', () => {
      const factory1 = StorageFactory.getInstance();
      const factory2 = StorageFactory.getInstance();
      expect(factory1).toBe(factory2);
    });

    it('should select available adapter', async () => {
      const factory = StorageFactory.getInstance();
      const adapter = await factory.getAdapter();
      
      // Should select LocalStorage in test environment
      expect(adapter).toBeDefined();
      expect(['LocalStorage', 'Memory']).toContain(adapter.name);
    });

    it('should return storage info', async () => {
      const factory = StorageFactory.getInstance();
      const info = await factory.getStorageInfo();
      
      expect(info.adapter).toBeDefined();
      expect(info.usage).toBeDefined();
      expect(info.usage.used).toBeGreaterThanOrEqual(0);
      expect(info.usage.quota).toBeGreaterThan(0);
    });
  });

  describe('EnhancedStorageService', () => {
    let service: EnhancedStorageService;

    beforeEach(() => {
      service = new EnhancedStorageService();
      localStorage.clear();
    });

    const createTestLevel = (): Level => ({
      id: 'test-level-123',
      name: 'Test Level',
      author: 'Test Author',
      createdAt: 1000000,
      updatedAt: 2000000,
      version: LEVEL_FORMAT_VERSION,
      metadata: {
        difficulty: 'medium',
        tags: ['test'],
        description: 'Test level',
      },
      grid: {
        width: 10,
        height: 10,
        blocks: [
          { x: 0, y: 0, type: 'normal', health: 1 },
        ],
      },
    });

    it('should save and load levels', async () => {
      const level = createTestLevel();
      await service.saveLevel(level);

      const loaded = await service.loadLevel(level.id);
      expect(loaded).toEqual(level);
    });

    it('should delete levels', async () => {
      const level = createTestLevel();
      await service.saveLevel(level);
      await service.deleteLevel(level.id);

      const loaded = await service.loadLevel(level.id);
      expect(loaded).toBeNull();
    });

    it('should list all levels', async () => {
      const level1 = { ...createTestLevel(), id: 'level-1' };
      const level2 = { ...createTestLevel(), id: 'level-2' };

      await service.saveLevel(level1);
      await service.saveLevel(level2);

      const levels = await service.listLevels();
      expect(levels).toHaveLength(2);
      expect(levels.map(l => l.id)).toContain('level-1');
      expect(levels.map(l => l.id)).toContain('level-2');
    });

    it('should clear all levels', async () => {
      const level1 = { ...createTestLevel(), id: 'level-1' };
      const level2 = { ...createTestLevel(), id: 'level-2' };

      await service.saveLevel(level1);
      await service.saveLevel(level2);
      await service.clearAllLevels();

      const levels = await service.listLevels();
      expect(levels).toHaveLength(0);
    });

    it('should handle corrupted data gracefully', async () => {
      const factory = StorageFactory.getInstance();
      const adapter = await factory.getAdapter();
      
      // Save corrupted JSON
      await adapter.set('level_corrupted', 'not-valid-json');

      const level = await service.loadLevel('corrupted');
      expect(level).toBeNull();

      // Should skip corrupted level in listing
      const levels = await service.listLevels();
      expect(levels).toHaveLength(0);
    });

    it('should migrate data between adapters', async () => {
      const memoryAdapter = new MemoryStorage();
      const localAdapter = new LocalStorageAdapter();

      await memoryAdapter.set('key1', 'value1');
      await memoryAdapter.set('key2', 'value2');

      await service.migrateData(memoryAdapter, localAdapter);

      const value1 = await localAdapter.get('key1');
      const value2 = await localAdapter.get('key2');
      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });
  });
});