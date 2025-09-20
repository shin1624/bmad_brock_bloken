/**
 * Shared test helpers and utilities for particle system tests
 * Optimized for performance and reusability
 */
import { EventBus } from '../../core/EventBus';
import { ParticleSystem } from '../ParticleSystem';
import { ParticleMonitor } from '../ParticleMonitor';
import { BackgroundParticleSystem } from '../BackgroundParticleSystem';
import { vi } from 'vitest';

/**
 * Singleton test factory to reduce object creation overhead
 */
export class ParticleTestFactory {
  private static eventBus: EventBus | null = null;
  
  /**
   * Reset the factory state
   */
  static reset(): void {
    this.eventBus = null;
  }
  private static mockCanvas: HTMLCanvasElement | null = null;
  private static mockContext: CanvasRenderingContext2D | null = null;

  /**
   * Get or create shared EventBus instance
   */
  static getEventBus(): EventBus {
    if (!this.eventBus) {
      this.eventBus = new EventBus();
    }
    return this.eventBus;
  }

  /**
   * Reset shared EventBus
   */
  static resetEventBus(): void {
    if (this.eventBus) {
      // Clear all listeners
      this.eventBus = new EventBus();
    }
  }

  /**
   * Create lightweight particle system for testing
   */
  static createLightweightParticleSystem(config?: Partial<any>): ParticleSystem {
    return new ParticleSystem(this.getEventBus(), {
      maxParticles: 50, // Reduced for faster tests
      preFillCount: 5,  // Minimal pre-fill
      ...config
    });
  }

  /**
   * Create mock canvas context with minimal setup
   */
  static createMockContext(): CanvasRenderingContext2D {
    if (!this.mockContext) {
      this.mockContext = {
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        globalAlpha: 1,
        fillStyle: '',
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        fillRect: vi.fn(),
        fillText: vi.fn(),
        closePath: vi.fn(),
        font: '',
        textAlign: 'left' as CanvasTextAlign,
      } as unknown as CanvasRenderingContext2D;
    }
    return this.mockContext;
  }

  /**
   * Create minimal particle effect for testing
   */
  static createMinimalEffect(system: ParticleSystem, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      system.createEffect('spark', { x: 100, y: 100 });
    }
  }

  /**
   * Fast-forward particle lifecycle
   */
  static fastForwardParticles(system: ParticleSystem, time: number = 1000): void {
    // Single update with large delta instead of many small updates
    system.update(time);
  }

  /**
   * Cleanup all shared resources
   */
  static cleanup(): void {
    this.resetEventBus();
    this.mockCanvas = null;
    this.mockContext = null;
  }
}

/**
 * Performance test utilities
 */
export class PerformanceTestUtils {
  /**
   * Run test with performance timing
   */
  static async runWithTiming<T>(
    operation: () => T | Promise<T>,
    maxTime: number = 100
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    if (duration > maxTime) {
      console.warn(`Operation took ${duration}ms, expected < ${maxTime}ms`);
    }
    
    return { result, duration };
  }

  /**
   * Skip heavy tests in CI environment
   */
  static skipInCI(testFn: () => void): void {
    if (process.env.CI) {
      return;
    }
    testFn();
  }
}

/**
 * Flaky test stabilizers
 */
export class TestStabilizers {
  /**
   * Retry flaky assertions with timeout
   */
  static async retryAssertion(
    assertion: () => boolean | Promise<boolean>,
    maxRetries: number = 3,
    delay: number = 10
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      const result = await assertion();
      if (result) {
        return;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Assertion failed after retries');
  }

  /**
   * Wait for condition with timeout
   */
  static async waitForCondition(
    condition: () => boolean,
    timeout: number = 100
  ): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    throw new Error('Condition not met within timeout');
  }
}

/**
 * Edge case generators for stress testing
 */
export class EdgeCaseGenerators {
  /**
   * Generate extreme particle counts
   */
  static generateExtremeParticleCounts(): number[] {
    return [0, 1, 10, 100, 999, 1000, 1001, 10000];
  }

  /**
   * Generate boundary positions
   */
  static generateBoundaryPositions(width: number, height: number): Array<{x: number, y: number}> {
    return [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: 0, y: height },
      { x: width, y: height },
      { x: width / 2, y: height / 2 },
      { x: -100, y: -100 },
      { x: width + 100, y: height + 100 },
      { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
      { x: Number.MIN_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER }
    ];
  }

  /**
   * Simulate FPS fluctuations
   */
  static simulateFPSFluctuations(
    system: ParticleSystem,
    config: {
      pattern: 'rapid' | 'sine' | 'instant';
      duration: number;
      minFPS: number;
      maxFPS: number;
    }
  ): void {
    // Access the private fps property through the metrics
    const metrics = system.getPerformanceMetrics();
    
    // Calculate target FPS based on pattern
    let targetFPS: number;
    switch (config.pattern) {
      case 'rapid':
        targetFPS = Math.random() * (config.maxFPS - config.minFPS) + config.minFPS;
        break;
      case 'sine':
        targetFPS = config.minFPS + (config.maxFPS - config.minFPS) / 2;
        break;
      case 'instant':
        targetFPS = config.minFPS;
        break;
      default:
        targetFPS = 60;
    }
    
    // Simulate the FPS by adjusting update delta time
    const targetDelta = 1 / targetFPS;
    
    // Run multiple update cycles to simulate the duration
    const cycles = Math.floor(config.duration / 16.67);
    for (let i = 0; i < cycles; i++) {
      system.update(targetDelta);
    }
  }

  /**
   * Generate random theme configurations
   */
  static generateRandomTheme(): any {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return {
      colors: {
        particle: colors[Math.floor(Math.random() * colors.length)],
        trail: colors[Math.floor(Math.random() * colors.length)] + '80'
      },
      sizes: {
        min: Math.random() * 5,
        max: 5 + Math.random() * 10
      },
      effects: {
        glow: Math.random() > 0.5,
        trail: Math.random() > 0.5
      }
    };
  }

  /**
   * Generate stress test particle bursts
   */
  static generateStressBurst(system: ParticleSystem, intensity: 'low' | 'medium' | 'high'): void {
    const counts = {
      low: 10,
      medium: 50,
      high: 100
    };
    
    const count = counts[intensity];
    for (let i = 0; i < count; i++) {
      system.emit(
        Math.random() * 800,
        Math.random() * 600,
        {
          count: Math.floor(Math.random() * 5) + 1,
          speed: Math.random() * 200 + 50
        }
      );
    }
  }

  /**
   * Generate particles at exact limit
   */
  static generateExactLimit(system: ParticleSystem, limit: number = 1000): void {
    const currentCount = system.getParticleCount();
    const toCreate = limit - currentCount;
    
    for (let i = 0; i < toCreate; i++) {
      system.createEffect('spark', { 
        x: Math.random() * 800, 
        y: Math.random() * 600 
      });
    }
  }

  /**
   * Generate concurrent effect creation scenario
   */
  static createConcurrentEffects(system: ParticleSystem): Promise<void>[] {
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(
        Promise.resolve().then(() => {
          system.createEffect('explosion', { x: i * 10, y: i * 10 });
        })
      );
    }
    
    return promises;
  }
}

