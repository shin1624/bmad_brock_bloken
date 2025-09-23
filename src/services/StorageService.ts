import { Level } from '../types/editor.types';

/**
 * Storage Service with fallback strategy
 * Provides a unified interface for level persistence with multiple storage backends
 */

export interface StorageAdapter {
  name: string;
  isAvailable(): boolean | Promise<boolean>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  getKeys(): Promise<string[]>;
  getUsage?(): Promise<{ used: number; quota: number }>;
}

/**
 * IndexedDB Storage Adapter
 * Primary storage for large data sets
 */
export class IndexedDBStorage implements StorageAdapter {
  name = 'IndexedDB';
  private dbName = 'BmadLevels';
  private storeName = 'levels';
  private version = 1;
  private db: IDBDatabase | null = null;

  isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(false);
        return;
      }

      try {
        const testRequest = window.indexedDB.open('test', 1);
        testRequest.onsuccess = () => {
          testRequest.result.close();
          window.indexedDB.deleteDatabase('test');
          resolve(true);
        };
        testRequest.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async get(key: string): Promise<string | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get from IndexedDB'));
    });
  }

  async set(key: string, value: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to set in IndexedDB'));
    });
  }

  async remove(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to remove from IndexedDB'));
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Failed to clear IndexedDB'));
    });
  }

  async getKeys(): Promise<string[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAllKeys();

      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(new Error('Failed to get keys from IndexedDB'));
    });
  }

  async getUsage(): Promise<{ used: number; quota: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    }
    return { used: 0, quota: 0 };
  }
}

/**
 * LocalStorage Adapter with quota management
 * Fallback for when IndexedDB is not available
 */
export class LocalStorageAdapter implements StorageAdapter {
  name = 'LocalStorage';
  private prefix = 'bmad.levels.';

  isAvailable(): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    try {
      const testKey = '__test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.prefix + key);
    } catch (error) {
      console.error('LocalStorage get error:', error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const fullKey = this.prefix + key;
    
    try {
      // Check if we have enough space
      const estimatedSize = new Blob([value]).size;
      const available = this.getAvailableSpace();
      
      if (available !== -1 && estimatedSize > available) {
        throw new Error('Insufficient storage space');
      }

      window.localStorage.setItem(fullKey, value);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded');
      }
      throw error;
    }
  }

  async remove(key: string): Promise<void> {
    window.localStorage.removeItem(this.prefix + key);
  }

  async clear(): Promise<void> {
    const keys = await this.getKeys();
    keys.forEach(key => {
      window.localStorage.removeItem(this.prefix + key);
    });
  }

  async getKeys(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  private getAvailableSpace(): number {
    if (!window.localStorage) return -1;

    try {
      let testKey = '__quota_test__';
      let testData = 'a';
      let used = 0;

      // Estimate current usage
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          const value = window.localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }

      // Try to fill remaining space (up to 5MB typical limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      const remaining = maxSize - used;

      return Math.max(0, remaining);
    } catch {
      return -1;
    }
  }

  async getUsage(): Promise<{ used: number; quota: number }> {
    let used = 0;
    
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = window.localStorage.getItem(key);
        if (value) {
          used += key.length + value.length;
        }
      }
    }

    return {
      used,
      quota: 5 * 1024 * 1024, // Assume 5MB limit
    };
  }
}

/**
 * Memory Storage Adapter
 * Session-only fallback when persistent storage is not available
 */
export class MemoryStorage implements StorageAdapter {
  name = 'Memory';
  private storage = new Map<string, string>();

  isAvailable(): boolean {
    return true; // Always available
  }

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async getKeys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async getUsage(): Promise<{ used: number; quota: number }> {
    let used = 0;
    this.storage.forEach((value, key) => {
      used += key.length + value.length;
    });

    return {
      used,
      quota: 50 * 1024 * 1024, // Allow 50MB in memory
    };
  }
}

/**
 * Storage Factory
 * Manages storage adapters with fallback strategy
 */
export class StorageFactory {
  private static instance: StorageFactory;
  private adapter: StorageAdapter | null = null;
  private adapters: StorageAdapter[] = [
    new IndexedDBStorage(),
    new LocalStorageAdapter(),
    new MemoryStorage(),
  ];

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory();
    }
    return StorageFactory.instance;
  }

  async getAdapter(): Promise<StorageAdapter> {
    if (this.adapter) return this.adapter;

    for (const adapter of this.adapters) {
      const isAvailable = await adapter.isAvailable();
      if (isAvailable) {
        this.adapter = adapter;
        console.log(`Using ${adapter.name} storage adapter`);
        return adapter;
      }
    }

    // Should never happen as MemoryStorage is always available
    throw new Error('No storage adapter available');
  }

  async getCurrentAdapterName(): Promise<string> {
    const adapter = await this.getAdapter();
    return adapter.name;
  }

  async getStorageInfo(): Promise<{
    adapter: string;
    usage: { used: number; quota: number };
  }> {
    const adapter = await this.getAdapter();
    const usage = adapter.getUsage ? await adapter.getUsage() : { used: 0, quota: 0 };
    
    return {
      adapter: adapter.name,
      usage,
    };
  }
}

/**
 * Enhanced Storage Service
 * High-level API for level storage with automatic serialization
 */
export class EnhancedStorageService {
  private factory = StorageFactory.getInstance();

  async saveLevel(level: Level): Promise<void> {
    const adapter = await this.factory.getAdapter();
    const json = JSON.stringify(level);
    await adapter.set(`level_${level.id}`, json);
  }

  async loadLevel(id: string): Promise<Level | null> {
    const adapter = await this.factory.getAdapter();
    const json = await adapter.get(`level_${id}`);
    if (!json) return null;
    
    try {
      return JSON.parse(json) as Level;
    } catch (error) {
      console.error('Failed to parse level:', error);
      return null;
    }
  }

  async deleteLevel(id: string): Promise<void> {
    const adapter = await this.factory.getAdapter();
    await adapter.remove(`level_${id}`);
  }

  async listLevels(): Promise<Level[]> {
    const adapter = await this.factory.getAdapter();
    const keys = await adapter.getKeys();
    const levelKeys = keys.filter(key => key.startsWith('level_'));
    
    const levels: Level[] = [];
    for (const key of levelKeys) {
      const json = await adapter.get(key);
      if (json) {
        try {
          levels.push(JSON.parse(json) as Level);
        } catch (error) {
          console.error(`Failed to parse level ${key}:`, error);
        }
      }
    }
    
    return levels;
  }

  async clearAllLevels(): Promise<void> {
    const adapter = await this.factory.getAdapter();
    const keys = await adapter.getKeys();
    const levelKeys = keys.filter(key => key.startsWith('level_'));
    
    for (const key of levelKeys) {
      await adapter.remove(key);
    }
  }

  async getStorageInfo() {
    return this.factory.getStorageInfo();
  }

  /**
   * Migrate data between storage adapters
   */
  async migrateData(fromAdapter: StorageAdapter, toAdapter: StorageAdapter): Promise<void> {
    const keys = await fromAdapter.getKeys();
    
    for (const key of keys) {
      const value = await fromAdapter.get(key);
      if (value) {
        await toAdapter.set(key, value);
      }
    }
  }
}

// Export singleton instance
export const storageService = new EnhancedStorageService();