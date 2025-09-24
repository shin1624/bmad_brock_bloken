import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  IndexedDBStorage,
  LocalStorageAdapter,
  MemoryStorage,
  StorageFactory,
  EnhancedStorageService,
  type StorageAdapter,
} from '../StorageService';
import type { Level } from '../../types/editor.types';

// Mock IndexedDB
class MockIDBDatabase {
  name: string;
  version: number;
  objectStoreNames: DOMStringList;

  constructor(name: string, version: number) {
    this.name = name;
    this.version = version;
    this.objectStoreNames = {
      contains: (name: string) => name === 'levels',
      item: (index: number) => index === 0 ? 'levels' : null,
      length: 1,
    } as DOMStringList;
  }

  close() {}

  createObjectStore(name: string) {
    return {
      createIndex: vi.fn(),
    };
  }

  transaction(stores: string[], mode: IDBTransactionMode) {
    return new MockIDBTransaction(stores, mode);
  }
}

class MockIDBTransaction {
  mode: IDBTransactionMode;
  stores: string[];
  db = new MockIDBDatabase('test', 1);
  error = null;

  constructor(stores: string[], mode: IDBTransactionMode) {
    this.stores = stores;
    this.mode = mode;
  }

  objectStore(name: string) {
    return new MockIDBObjectStore(name);
  }

  abort() {}
  commit() {}
}

class MockIDBObjectStore {
  name: string;
  data = new Map<string, any>();

  constructor(name: string) {
    this.name = name;
  }

  get(key: string) {
    return {
      result: this.data.get(key) || null,
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  put(value: any, key: string) {
    this.data.set(key, value);
    return {
      result: undefined,
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  delete(key: string) {
    this.data.delete(key);
    return {
      result: undefined,
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  clear() {
    this.data.clear();
    return {
      result: undefined,
      onsuccess: null as any,
      onerror: null as any,
    };
  }

  getAllKeys() {
    return {
      result: Array.from(this.data.keys()),
      onsuccess: null as any,
      onerror: null as any,
    };
  }
}

describe('StorageService - Enhanced Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IndexedDBStorage', () => {
    let storage: IndexedDBStorage;
    let mockIndexedDB: any;

    beforeEach(() => {
      storage = new IndexedDBStorage();

      // Create mock IndexedDB
      mockIndexedDB = {
        databases: new Map(),
        open: vi.fn((name: string, version: number) => {
          const db = new MockIDBDatabase(name, version);
          mockIndexedDB.databases.set(name, db);

          const request = {
            result: db,
            error: null,
            onsuccess: null as any,
            onerror: null as any,
            onupgradeneeded: null as any,
          };

          setTimeout(() => {
            if (request.onsuccess) request.onsuccess({ target: request });
          }, 0);

          return request;
        }),
        deleteDatabase: vi.fn((name: string) => {
          mockIndexedDB.databases.delete(name);
          return { onsuccess: null, onerror: null };
        }),
      };

      // @ts-ignore
      global.indexedDB = mockIndexedDB;
    });

    afterEach(() => {
      // @ts-ignore
      delete global.indexedDB;
    });

    it('should check availability when IndexedDB is present', async () => {
      const available = await storage.isAvailable();
      expect(available).toBe(true);
    });

    it('should handle missing IndexedDB', async () => {
      // @ts-ignore
      delete global.indexedDB;
      const available = await storage.isAvailable();
      expect(available).toBe(false);
    });

    it('should handle IndexedDB errors during availability check', async () => {
      mockIndexedDB.open = vi.fn(() => {
        const request = {
          error: new Error('Failed'),
          onerror: null as any,
        };
        setTimeout(() => {
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });

      const available = await storage.isAvailable();
      expect(available).toBe(false);
    });

    it('should store and retrieve data', async () => {
      await storage.set('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('non-existent');
      expect(value).toBeNull();
    });

    it('should remove data', async () => {
      await storage.set('to-remove', 'value');
      await storage.remove('to-remove');
      const value = await storage.get('to-remove');
      expect(value).toBeNull();
    });

    it('should clear all data', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.clear();

      const value1 = await storage.get('key1');
      const value2 = await storage.get('key2');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
    });

    it('should get all keys', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.set('key3', 'value3');

      const keys = await storage.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should estimate storage usage', async () => {
      // Mock navigator.storage
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: vi.fn().mockResolvedValue({
            usage: 1000,
            quota: 10000,
          }),
        },
        writable: true,
      });

      const usage = await storage.getUsage();
      expect(usage.used).toBe(1000);
      expect(usage.quota).toBe(10000);
    });

    it('should handle missing storage API', async () => {
      // @ts-ignore
      delete navigator.storage;

      const usage = await storage.getUsage();
      expect(usage.used).toBe(0);
      expect(usage.quota).toBe(0);
    });
  });

  describe('LocalStorageAdapter', () => {
    let storage: LocalStorageAdapter;
    let mockLocalStorage: { [key: string]: string };

    beforeEach(() => {
      storage = new LocalStorageAdapter();
      mockLocalStorage = {};

      global.localStorage = {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        }),
        key: vi.fn((index: number) => Object.keys(mockLocalStorage)[index] || null),
        get length() {
          return Object.keys(mockLocalStorage).length;
        },
      } as Storage;
    });

    it('should check availability', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('should handle missing localStorage', () => {
      // @ts-ignore
      delete global.localStorage;
      expect(storage.isAvailable()).toBe(false);
    });

    it('should handle localStorage errors', () => {
      global.localStorage.setItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      expect(storage.isAvailable()).toBe(false);
    });

    it('should store and retrieve data with prefix', async () => {
      await storage.set('test-key', 'test-value');
      expect(mockLocalStorage['bmad.levels.test-key']).toBe('test-value');

      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should handle get errors gracefully', async () => {
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('Get error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const value = await storage.get('test-key');

      expect(value).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle quota exceeded errors', async () => {
      global.localStorage.setItem = vi.fn(() => {
        const error = new Error('Quota exceeded');
        error.name = 'QuotaExceededError';
        throw error;
      });

      await expect(storage.set('key', 'value')).rejects.toThrow('LocalStorage quota exceeded');
    });

    it('should check available space before storing', async () => {
      // Mock Blob to simulate size calculation
      global.Blob = vi.fn().mockImplementation((parts: any[]) => ({
        size: parts[0].length,
      })) as any;

      // Simulate almost full storage
      const largeData = 'x'.repeat(5 * 1024 * 1024 - 100); // 5MB - 100 bytes
      mockLocalStorage['existing'] = largeData;

      // Try to store data larger than available space
      const newData = 'y'.repeat(200);
      await expect(storage.set('new', newData)).rejects.toThrow('Insufficient storage space');
    });

    it('should remove data with prefix', async () => {
      mockLocalStorage['bmad.levels.to-remove'] = 'value';
      await storage.remove('to-remove');
      expect(mockLocalStorage['bmad.levels.to-remove']).toBeUndefined();
    });

    it('should clear only prefixed data', async () => {
      mockLocalStorage['bmad.levels.key1'] = 'value1';
      mockLocalStorage['bmad.levels.key2'] = 'value2';
      mockLocalStorage['other-key'] = 'other-value';

      await storage.clear();

      expect(mockLocalStorage['bmad.levels.key1']).toBeUndefined();
      expect(mockLocalStorage['bmad.levels.key2']).toBeUndefined();
      expect(mockLocalStorage['other-key']).toBe('other-value');
    });

    it('should get only prefixed keys', async () => {
      mockLocalStorage['bmad.levels.key1'] = 'value1';
      mockLocalStorage['bmad.levels.key2'] = 'value2';
      mockLocalStorage['other-key'] = 'other-value';

      const keys = await storage.getKeys();

      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).not.toContain('other-key');
    });

    it('should calculate storage usage', async () => {
      mockLocalStorage['bmad.levels.key1'] = 'value1';
      mockLocalStorage['bmad.levels.key2'] = 'value2';
      mockLocalStorage['other-key'] = 'other-value';

      const usage = await storage.getUsage();

      const expectedUsed =
        'bmad.levels.key1'.length + 'value1'.length +
        'bmad.levels.key2'.length + 'value2'.length;

      expect(usage.used).toBe(expectedUsed);
      expect(usage.quota).toBe(5 * 1024 * 1024); // 5MB
    });
  });

  describe('MemoryStorage', () => {
    let storage: MemoryStorage;

    beforeEach(() => {
      storage = new MemoryStorage();
    });

    it('should always be available', () => {
      expect(storage.isAvailable()).toBe(true);
    });

    it('should store and retrieve data', async () => {
      await storage.set('test-key', 'test-value');
      const value = await storage.get('test-key');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent keys', async () => {
      const value = await storage.get('non-existent');
      expect(value).toBeNull();
    });

    it('should remove data', async () => {
      await storage.set('to-remove', 'value');
      await storage.remove('to-remove');
      const value = await storage.get('to-remove');
      expect(value).toBeNull();
    });

    it('should clear all data', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.clear();

      const keys = await storage.getKeys();
      expect(keys).toHaveLength(0);
    });

    it('should get all keys', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');
      await storage.set('key3', 'value3');

      const keys = await storage.getKeys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should calculate memory usage', async () => {
      await storage.set('key1', 'value1');
      await storage.set('key2', 'value2');

      const usage = await storage.getUsage();

      const expectedUsed =
        'key1'.length + 'value1'.length +
        'key2'.length + 'value2'.length;

      expect(usage.used).toBe(expectedUsed);
      expect(usage.quota).toBe(50 * 1024 * 1024); // 50MB for memory storage
    });

    it('should handle large data sets', async () => {
      const largeValue = 'x'.repeat(1024 * 1024); // 1MB
      await storage.set('large', largeValue);

      const retrieved = await storage.get('large');
      expect(retrieved).toBe(largeValue);
    });
  });

  describe('StorageFactory', () => {
    let factory: StorageFactory;

    beforeEach(() => {
      // Reset singleton
      (StorageFactory as any).instance = undefined;
      factory = StorageFactory.getInstance();
    });

    it('should be a singleton', () => {
      const factory1 = StorageFactory.getInstance();
      const factory2 = StorageFactory.getInstance();
      expect(factory1).toBe(factory2);
    });

    it('should select first available adapter', async () => {
      // Mock adapters
      const mockIndexedDB = { isAvailable: vi.fn().mockResolvedValue(false) };
      const mockLocalStorage = {
        name: 'LocalStorage',
        isAvailable: vi.fn().mockResolvedValue(true),
      };
      const mockMemory = { isAvailable: vi.fn().mockResolvedValue(true) };

      (factory as any).adapters = [mockIndexedDB, mockLocalStorage, mockMemory];

      const adapter = await factory.getAdapter();
      expect(adapter).toBe(mockLocalStorage);
      expect(mockIndexedDB.isAvailable).toHaveBeenCalled();
      expect(mockLocalStorage.isAvailable).toHaveBeenCalled();
      expect(mockMemory.isAvailable).not.toHaveBeenCalled(); // Should stop at first available
    });

    it('should cache selected adapter', async () => {
      const mockAdapter = {
        name: 'Cached',
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      (factory as any).adapters = [mockAdapter];

      const adapter1 = await factory.getAdapter();
      const adapter2 = await factory.getAdapter();

      expect(adapter1).toBe(adapter2);
      expect(mockAdapter.isAvailable).toHaveBeenCalledTimes(1); // Only checked once
    });

    it('should get current adapter name', async () => {
      const mockAdapter = {
        name: 'TestAdapter',
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      (factory as any).adapters = [mockAdapter];

      const name = await factory.getCurrentAdapterName();
      expect(name).toBe('TestAdapter');
    });

    it('should get storage info', async () => {
      const mockAdapter = {
        name: 'TestAdapter',
        isAvailable: vi.fn().mockResolvedValue(true),
        getUsage: vi.fn().mockResolvedValue({ used: 1000, quota: 10000 }),
      };

      (factory as any).adapters = [mockAdapter];

      const info = await factory.getStorageInfo();

      expect(info.adapter).toBe('TestAdapter');
      expect(info.usage.used).toBe(1000);
      expect(info.usage.quota).toBe(10000);
    });

    it('should handle adapter without getUsage method', async () => {
      const mockAdapter = {
        name: 'SimpleAdapter',
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      (factory as any).adapters = [mockAdapter];

      const info = await factory.getStorageInfo();

      expect(info.usage.used).toBe(0);
      expect(info.usage.quota).toBe(0);
    });
  });

  describe('EnhancedStorageService', () => {
    let service: EnhancedStorageService;
    let mockAdapter: StorageAdapter;

    beforeEach(() => {
      service = new EnhancedStorageService();

      // Create mock adapter
      mockAdapter = {
        name: 'MockAdapter',
        isAvailable: vi.fn().mockResolvedValue(true),
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getKeys: vi.fn(),
        getUsage: vi.fn().mockResolvedValue({ used: 1000, quota: 10000 }),
      };

      // Mock factory
      (service as any).factory = {
        getAdapter: vi.fn().mockResolvedValue(mockAdapter),
        getStorageInfo: vi.fn().mockResolvedValue({
          adapter: 'MockAdapter',
          usage: { used: 1000, quota: 10000 },
        }),
      };
    });

    it('should save level with prefixed key', async () => {
      const level: Level = {
        id: 'test-level',
        name: 'Test Level',
        version: '1.0.0',
        grid: {
          width: 10,
          height: 10,
          blocks: [],
        },
      };

      await service.saveLevel(level);

      expect(mockAdapter.set).toHaveBeenCalledWith(
        'level_test-level',
        JSON.stringify(level)
      );
    });

    it('should load level by ID', async () => {
      const level: Level = {
        id: 'test-level',
        name: 'Test Level',
        version: '1.0.0',
        grid: {
          width: 10,
          height: 10,
          blocks: [],
        },
      };

      (mockAdapter.get as any).mockResolvedValue(JSON.stringify(level));

      const loaded = await service.loadLevel('test-level');

      expect(mockAdapter.get).toHaveBeenCalledWith('level_test-level');
      expect(loaded).toEqual(level);
    });

    it('should return null for non-existent level', async () => {
      (mockAdapter.get as any).mockResolvedValue(null);

      const loaded = await service.loadLevel('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      (mockAdapter.get as any).mockResolvedValue('invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const loaded = await service.loadLevel('test');

      expect(loaded).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should delete level', async () => {
      await service.deleteLevel('test-level');
      expect(mockAdapter.remove).toHaveBeenCalledWith('level_test-level');
    });

    it('should list all levels', async () => {
      const level1: Level = {
        id: 'level1',
        name: 'Level 1',
        version: '1.0.0',
        grid: { width: 10, height: 10, blocks: [] },
      };

      const level2: Level = {
        id: 'level2',
        name: 'Level 2',
        version: '1.0.0',
        grid: { width: 15, height: 15, blocks: [] },
      };

      (mockAdapter.getKeys as any).mockResolvedValue([
        'level_level1',
        'level_level2',
        'other_key',
      ]);

      (mockAdapter.get as any).mockImplementation((key: string) => {
        if (key === 'level_level1') return Promise.resolve(JSON.stringify(level1));
        if (key === 'level_level2') return Promise.resolve(JSON.stringify(level2));
        return Promise.resolve(null);
      });

      const levels = await service.listLevels();

      expect(levels).toHaveLength(2);
      expect(levels).toContainEqual(level1);
      expect(levels).toContainEqual(level2);
    });

    it('should handle corrupted level data in list', async () => {
      (mockAdapter.getKeys as any).mockResolvedValue(['level_corrupted']);
      (mockAdapter.get as any).mockResolvedValue('invalid json');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const levels = await service.listLevels();

      expect(levels).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should clear only level keys', async () => {
      (mockAdapter.getKeys as any).mockResolvedValue([
        'level_1',
        'level_2',
        'settings_key',
        'level_3',
      ]);

      await service.clearAllLevels();

      expect(mockAdapter.remove).toHaveBeenCalledTimes(3);
      expect(mockAdapter.remove).toHaveBeenCalledWith('level_1');
      expect(mockAdapter.remove).toHaveBeenCalledWith('level_2');
      expect(mockAdapter.remove).toHaveBeenCalledWith('level_3');
      expect(mockAdapter.remove).not.toHaveBeenCalledWith('settings_key');
    });

    it('should get storage info from factory', async () => {
      const info = await service.getStorageInfo();

      expect(info.adapter).toBe('MockAdapter');
      expect(info.usage.used).toBe(1000);
      expect(info.usage.quota).toBe(10000);
    });

    it('should migrate data between adapters', async () => {
      const fromAdapter: StorageAdapter = {
        name: 'From',
        isAvailable: vi.fn().mockResolvedValue(true),
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getKeys: vi.fn().mockResolvedValue(['key1', 'key2']),
      };

      const toAdapter: StorageAdapter = {
        name: 'To',
        isAvailable: vi.fn().mockResolvedValue(true),
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getKeys: vi.fn(),
      };

      (fromAdapter.get as any).mockImplementation((key: string) => {
        if (key === 'key1') return Promise.resolve('value1');
        if (key === 'key2') return Promise.resolve('value2');
        return Promise.resolve(null);
      });

      await service.migrateData(fromAdapter, toAdapter);

      expect(toAdapter.set).toHaveBeenCalledTimes(2);
      expect(toAdapter.set).toHaveBeenCalledWith('key1', 'value1');
      expect(toAdapter.set).toHaveBeenCalledWith('key2', 'value2');
    });

    it('should skip null values during migration', async () => {
      const fromAdapter: StorageAdapter = {
        name: 'From',
        isAvailable: vi.fn().mockResolvedValue(true),
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getKeys: vi.fn().mockResolvedValue(['key1']),
      };

      const toAdapter: StorageAdapter = {
        name: 'To',
        isAvailable: vi.fn().mockResolvedValue(true),
        get: vi.fn(),
        set: vi.fn(),
        remove: vi.fn(),
        clear: vi.fn(),
        getKeys: vi.fn(),
      };

      await service.migrateData(fromAdapter, toAdapter);

      expect(toAdapter.set).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests', () => {
    it('should handle full workflow with MemoryStorage', async () => {
      const service = new EnhancedStorageService();
      const memoryAdapter = new MemoryStorage();

      // Force memory adapter
      (service as any).factory = {
        getAdapter: vi.fn().mockResolvedValue(memoryAdapter),
        getStorageInfo: vi.fn().mockResolvedValue({
          adapter: 'Memory',
          usage: { used: 0, quota: 50 * 1024 * 1024 },
        }),
      };

      // Save levels
      const level1: Level = {
        id: 'test-1',
        name: 'Test Level 1',
        version: '1.0.0',
        grid: { width: 10, height: 10, blocks: [] },
      };

      const level2: Level = {
        id: 'test-2',
        name: 'Test Level 2',
        version: '1.0.0',
        grid: { width: 20, height: 20, blocks: [] },
      };

      await service.saveLevel(level1);
      await service.saveLevel(level2);

      // List levels
      const levels = await service.listLevels();
      expect(levels).toHaveLength(2);

      // Load specific level
      const loaded = await service.loadLevel('test-1');
      expect(loaded).toEqual(level1);

      // Delete level
      await service.deleteLevel('test-1');
      const afterDelete = await service.listLevels();
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0]).toEqual(level2);

      // Clear all
      await service.clearAllLevels();
      const afterClear = await service.listLevels();
      expect(afterClear).toHaveLength(0);
    });

    it('should handle storage fallback gracefully', async () => {
      const factory = StorageFactory.getInstance();

      // Create adapters with different availability
      const failingAdapter = {
        name: 'Failing',
        isAvailable: vi.fn().mockResolvedValue(false),
      };

      const workingAdapter = {
        name: 'Working',
        isAvailable: vi.fn().mockResolvedValue(true),
      };

      (factory as any).adapters = [failingAdapter, workingAdapter];
      (factory as any).adapter = null; // Reset cache

      const adapter = await factory.getAdapter();

      expect(adapter).toBe(workingAdapter);
      expect(failingAdapter.isAvailable).toHaveBeenCalled();
      expect(workingAdapter.isAvailable).toHaveBeenCalled();
    });

    it('should handle concurrent operations', async () => {
      const storage = new MemoryStorage();

      // Perform concurrent operations
      const operations = Promise.all([
        storage.set('key1', 'value1'),
        storage.set('key2', 'value2'),
        storage.set('key3', 'value3'),
        storage.get('key1'),
        storage.get('key2'),
        storage.getKeys(),
      ]);

      const results = await operations;

      // Verify final state
      const keys = await storage.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });
  });
});
