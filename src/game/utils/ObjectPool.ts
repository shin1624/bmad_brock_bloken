/**
 * Generic Object Pool for memory-efficient entity management
 * Reduces garbage collection pressure by reusing objects
 */

export class ObjectPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (obj: T) => void;
  private maxSize: number;
  private currentSize: number = 0;

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    maxSize: number = 1000
  ) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  /**
   * Get an object from the pool or create a new one
   */
  public acquire(): T {
    if (this.pool.length > 0) {
      const obj = this.pool.pop()!;
      this.resetFn(obj);
      return obj;
    }

    // Create new object if pool is empty
    this.currentSize++;
    return this.createFn();
  }

  /**
   * Return an object to the pool
   */
  public release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    } else {
      // Pool is full, let object be garbage collected
      this.currentSize--;
    }
  }

  /**
   * Pre-fill the pool with objects
   */
  public preFill(count: number): void {
    const fillCount = Math.min(count, this.maxSize - this.pool.length);
    
    for (let i = 0; i < fillCount; i++) {
      const obj = this.createFn();
      this.pool.push(obj);
      this.currentSize++;
    }
  }

  /**
   * Clear all objects from the pool
   */
  public clear(): void {
    this.pool.length = 0;
    this.currentSize = 0;
  }

  /**
   * Get current pool statistics
   */
  public getStats(): {
    poolSize: number;
    totalObjects: number;
    maxSize: number;
    utilizationRate: number;
  } {
    return {
      poolSize: this.pool.length,
      totalObjects: this.currentSize,
      maxSize: this.maxSize,
      utilizationRate: (this.currentSize - this.pool.length) / this.currentSize || 0
    };
  }

  /**
   * Check if pool is at capacity
   */
  public isFull(): boolean {
    return this.pool.length >= this.maxSize;
  }

  /**
   * Check if pool is empty
   */
  public isEmpty(): boolean {
    return this.pool.length === 0;
  }

  /**
   * Resize the pool maximum capacity
   */
  public resize(newMaxSize: number): void {
    this.maxSize = newMaxSize;
    
    // Trim pool if it exceeds new max size
    while (this.pool.length > newMaxSize) {
      this.pool.pop();
      this.currentSize--;
    }
  }

  /**
   * Get the current pool size
   */
  public getPoolSize(): number {
    return this.pool.length;
  }

  /**
   * Get the total number of objects created
   */
  public getTotalObjects(): number {
    return this.currentSize;
  }
}