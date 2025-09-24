/**
 * Test Helper Utilities
 * Common utilities and helpers for testing
 */

import { vi } from 'vitest';

/**
 * Advances fake timers and flushes promises
 */
export async function advanceTimersAndFlush(ms: number): Promise<void> {
  vi.advanceTimersByTime(ms);
  await flushPromises();
}

/**
 * Flushes all pending promises
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/**
 * Creates a mock function with type safety
 */
export function createMockFn<T extends (...args: any[]) => any>(): ReturnType<typeof vi.fn> & T {
  return vi.fn() as any;
}

/**
 * Waits for a condition to be true
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 50
): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Creates a deferred promise for testing async operations
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return {
    promise,
    resolve: resolve!,
    reject: reject!
  };
}

/**
 * Measures execution time of a function
 */
export async function measureTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  
  return { result, duration };
}

/**
 * Creates a test fixture that automatically cleans up
 */
export function createFixture<T>(
  setup: () => T | Promise<T>,
  teardown?: (fixture: T) => void | Promise<void>
) {
  let fixture: T | null = null;
  
  return {
    async setup() {
      fixture = await setup();
      return fixture;
    },
    async teardown() {
      if (fixture && teardown) {
        await teardown(fixture);
      }
      fixture = null;
    },
    get current() {
      return fixture;
    }
  };
}

/**
 * Suppresses console output during tests
 */
export function suppressConsole() {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  
  beforeEach(() => {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
    console.info = vi.fn();
  });
  
  afterEach(() => {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    console.info = originalConsole.info;
  });
  
  return {
    getConsoleOutput: () => ({
      log: (console.log as any).mock.calls,
      warn: (console.warn as any).mock.calls,
      error: (console.error as any).mock.calls,
      info: (console.info as any).mock.calls
    })
  };
}

/**
 * Creates a spy on an object method
 */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  method: K
): T[K] extends (...args: any[]) => any ? ReturnType<typeof vi.fn> : never {
  const original = obj[method];
  const spy = vi.fn(original as any);
  obj[method] = spy as any;
  
  return spy as any;
}

/**
 * Asserts that a promise rejects with a specific error
 */
export async function expectToReject(
  promise: Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> {
  try {
    await promise;
    throw new Error('Expected promise to reject, but it resolved');
  } catch (error: any) {
    if (errorMessage) {
      if (typeof errorMessage === 'string') {
        expect(error.message).toBe(errorMessage);
      } else {
        expect(error.message).toMatch(errorMessage);
      }
    }
  }
}

/**
 * Creates a mock event
 */
export function createMockEvent(type: string, options?: Partial<Event>): Event {
  const event = new Event(type);
  Object.assign(event, options);
  return event;
}

/**
 * Creates a mock keyboard event
 */
export function createMockKeyboardEvent(
  type: string,
  key: string,
  options?: Partial<KeyboardEvent>
): KeyboardEvent {
  const event = new KeyboardEvent(type, {
    key,
    ...options
  });
  return event;
}

/**
 * Creates a mock mouse event
 */
export function createMockMouseEvent(
  type: string,
  options?: Partial<MouseEvent>
): MouseEvent {
  const event = new MouseEvent(type, options);
  return event;
}

/**
 * Test data builder base class
 */
export abstract class TestDataBuilder<T> {
  protected data: Partial<T> = {};
  
  abstract build(): T;
  
  with<K extends keyof T>(key: K, value: T[K]): this {
    this.data[key] = value;
    return this;
  }
  
  reset(): this {
    this.data = {};
    return this;
  }
}