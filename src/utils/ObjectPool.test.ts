/**
 * @file ObjectPool.test.ts
 * Unit tests for ObjectPool utility class
 */
import { describe, it, expect, vi } from "vitest";
import { ObjectPool } from "./ObjectPool";

// Simple test class for pooling
class TestObject {
  public active: boolean = true;
  public value: number = 0;

  reset(): void {
    this.active = true;
    this.value = 0;
  }
}

describe("ObjectPool", () => {
  it("should create pool with initial capacity", () => {
    const pool = new ObjectPool<TestObject>(
      () => new TestObject(),
      10, // initial size
      100, // max size
    );

    expect(pool.getAvailableCount()).toBe(10);
    expect(pool.getTotalCount()).toBe(10);
  });

  it("should get object from pool", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 5, 100);

    const obj = pool.get();
    expect(obj).toBeDefined();
    expect(pool.getAvailableCount()).toBe(4);
  });

  it("should return object to pool", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 5, 100);

    const obj = pool.get();
    expect(pool.getAvailableCount()).toBe(4);

    if (obj) {
      pool.release(obj);
      expect(pool.getAvailableCount()).toBe(5);
    }
  });

  it("should enforce maximum limit of 1000 particles by default", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 1000);

    expect(pool.getTotalCount()).toBe(1000);
    expect(pool.getMaxSize()).toBe(1000);
  });

  it("should create new objects on demand up to max limit", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 2, 5);
    
    // Get all initial objects
    pool.get();
    pool.get();
    expect(pool.getAvailableCount()).toBe(0);
    
    // Should create new object
    const obj3 = pool.get();
    expect(obj3).toBeDefined();
    expect(pool.getTotalCount()).toBe(3);
  });

  it("should enforce overflow protection", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 2, 2);
    
    pool.get();
    pool.get();
    const obj3 = pool.get(); // Should return undefined (overflow protection)
    
    expect(obj3).toBeUndefined();
    expect(pool.getTotalCount()).toBe(2);
  });

  it("should track pool statistics", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 5, 10);
    
    const obj1 = pool.get();
    const obj2 = pool.get();
    
    const stats = pool.getStatistics();
    expect(stats.available).toBe(3);
    expect(stats.inUse).toBe(2);
    expect(stats.total).toBe(5);
    expect(stats.maxSize).toBe(10);
    expect(stats.utilizationPercent).toBe(20);
  });

  it("should reset objects when reset function provided", () => {
    const resetFn = vi.fn((obj: TestObject) => obj.reset());
    const pool = new ObjectPool<TestObject>(
      () => new TestObject(),
      2,
      10,
      resetFn
    );
    
    const obj = pool.get();
    if (obj) {
      obj.value = 42;
      pool.release(obj);
      expect(resetFn).toHaveBeenCalledWith(obj);
    }
  });

  it("should warn when releasing object not in use", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 2, 10);
    
    const outsideObj = new TestObject();
    pool.release(outsideObj);
    
    expect(consoleSpy).toHaveBeenCalledWith("Attempting to release object not in use");
    consoleSpy.mockRestore();
  });

  it("should clear unused objects", () => {
    const pool = new ObjectPool<TestObject>(() => new TestObject(), 5, 10);
    
    expect(pool.getAvailableCount()).toBe(5);
    pool.clearUnused();
    expect(pool.getAvailableCount()).toBe(0);
  });
});