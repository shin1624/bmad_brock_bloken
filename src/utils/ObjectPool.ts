/**
 * @file ObjectPool.ts
 * Generic object pool for memory-efficient object reuse
 */

export class ObjectPool<T> {
  private available: T[] = [];
  private inUse: T[] = [];
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;
  private totalCreated: number = 0;
  private peakUsage: number = 0;
  private overflowProtection: boolean = true;
  private references: WeakMap<T, number> = new WeakMap();

  constructor(
    createFn: () => T,
    initialSize: number,
    maxSize: number = 1000,
    resetFn?: (obj: T) => void
  ) {
    this.createFn = createFn;
    this.maxSize = maxSize;
    this.resetFn = resetFn;

    // Pre-allocate initial pool
    for (let i = 0; i < Math.min(initialSize, maxSize); i++) {
      const obj = createFn();
      this.available.push(obj);
      this.references.set(obj, Date.now());
      this.totalCreated++;
    }
  }

  /**
   * Get an object from the pool
   * Returns undefined if pool is at max capacity and no objects available
   */
  get(): T | undefined {
    let obj: T | undefined;

    if (this.available.length > 0) {
      obj = this.available.pop();
      if (obj) {
        this.inUse.push(obj);
      }
    } else if (this.totalCreated < this.maxSize) {
      // Create new object if under limit
      obj = this.createFn();
      this.inUse.push(obj);
      this.references.set(obj, Date.now());
      this.totalCreated++;
    } else if (!this.overflowProtection) {
      // Allow overflow if protection is disabled (not recommended)
      obj = this.createFn();
      this.inUse.push(obj);
      this.totalCreated++;
      console.warn(`ObjectPool overflow: ${this.totalCreated} objects created (max: ${this.maxSize})`);
    }
    // else return undefined (overflow protection active)

    // Track peak usage
    if (this.inUse.length > this.peakUsage) {
      this.peakUsage = this.inUse.length;
    }

    return obj;
  }

  /**
   * Release an object back to the pool
   */
  release(obj: T): void {
    const index = this.inUse.indexOf(obj);
    if (index === -1) {
      console.warn("Attempting to release object not in use");
      return;
    }

    // Remove from in-use
    this.inUse.splice(index, 1);

    // Reset if function provided
    if (this.resetFn) {
      this.resetFn(obj);
    }

    // Return to available pool if under limit
    if (this.available.length + this.inUse.length < this.maxSize) {
      this.available.push(obj);
      this.references.set(obj, Date.now());
    }
  }

  /**
   * Get pool statistics for monitoring
   */
  getStatistics(): {
    available: number;
    inUse: number;
    total: number;
    peak: number;
    maxSize: number;
    utilizationPercent: number;
  } {
    return {
      available: this.available.length,
      inUse: this.inUse.length,
      total: this.totalCreated,
      peak: this.peakUsage,
      maxSize: this.maxSize,
      utilizationPercent: (this.inUse.length / this.maxSize) * 100,
    };
  }

  /**
   * Clear all unused objects from memory (for cleanup)
   */
  clearUnused(): void {
    this.available = [];
  }

  /**
   * Enable/disable overflow protection
   */
  setOverflowProtection(enabled: boolean): void {
    this.overflowProtection = enabled;
  }

  // Compatibility methods for existing code
  getAvailableCount(): number {
    return this.available.length;
  }

  getTotalCount(): number {
    return this.totalCreated;
  }

  getMaxSize(): number {
    return this.maxSize;
  }
}
