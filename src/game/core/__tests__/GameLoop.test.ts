/**
 * GameLoop Unit Tests
 * Comprehensive testing for the core game loop implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameLoop } from '../GameLoop';
import type { GameLoopCallback, GameLoopConfig } from '@/types/game.types';

describe('GameLoop', () => {
  let gameLoop: GameLoop;
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let cancelRafSpy: ReturnType<typeof vi.spyOn>;
  let performanceNowSpy: ReturnType<typeof vi.spyOn>;
  
  beforeEach(() => {
    // Setup RAF mocks
    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    
    rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      // Simulate next frame
      setTimeout(() => {
        const cb = rafCallbacks.get(id);
        if (cb) {
          rafCallbacks.delete(id);
          cb(performance.now());
        }
      }, 16.67); // ~60 FPS
      return id;
    });
    
    cancelRafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      rafCallbacks.delete(id);
    });
    
    // Mock performance.now
    let currentTime = 0;
    performanceNowSpy = vi.spyOn(performance, 'now').mockImplementation(() => {
      currentTime += 16.67; // Simulate 60 FPS timing
      return currentTime;
    });
    
    // Use fake timers
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    if (gameLoop) {
      gameLoop.stop();
    }
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
  
  describe('Constructor', () => {
    it('should initialize with default configuration', () => {
      gameLoop = new GameLoop();
      expect(gameLoop).toBeDefined();
      expect(gameLoop.isRunning()).toBe(false);
      expect(gameLoop.isPaused()).toBe(false);
    });
    
    it('should accept custom configuration', () => {
      const config: GameLoopConfig = {
        targetFps: 30,
        enablePerformanceMonitoring: false
      };
      gameLoop = new GameLoop(config);
      expect(gameLoop).toBeDefined();
    });
  });
  
  describe('Start/Stop Control', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should start the game loop', () => {
      gameLoop.start();
      expect(gameLoop.isRunning()).toBe(true);
      expect(rafSpy).toHaveBeenCalled();
    });
    
    it('should not start if already running', () => {
      gameLoop.start();
      const initialCallCount = rafSpy.mock.calls.length;
      gameLoop.start(); // Try to start again
      expect(rafSpy.mock.calls.length).toBe(initialCallCount);
    });
    
    it('should stop the game loop', () => {
      gameLoop.start();
      gameLoop.stop();
      expect(gameLoop.isRunning()).toBe(false);
      expect(cancelRafSpy).toHaveBeenCalled();
    });
    
    it('should handle stop when not running', () => {
      expect(() => gameLoop.stop()).not.toThrow();
      expect(gameLoop.isRunning()).toBe(false);
    });
  });
  
  describe('Pause/Resume Control', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should pause the game loop', () => {
      gameLoop.start();
      gameLoop.pause();
      expect(gameLoop.isPaused()).toBe(true);
      expect(gameLoop.isRunning()).toBe(true);
    });
    
    it('should resume from pause', () => {
      gameLoop.start();
      gameLoop.pause();
      gameLoop.resume();
      expect(gameLoop.isPaused()).toBe(false);
      expect(gameLoop.isRunning()).toBe(true);
    });
    
    it('should not pause if not running', () => {
      gameLoop.pause();
      expect(gameLoop.isPaused()).toBe(false);
    });
    
    it('should not resume if not paused', () => {
      gameLoop.start();
      gameLoop.resume();
      expect(gameLoop.isPaused()).toBe(false);
    });
  });
  
  describe('Callback Management', () => {
    let updateCallback: GameLoopCallback;
    let renderCallback: GameLoopCallback;
    
    beforeEach(() => {
      gameLoop = new GameLoop();
      updateCallback = vi.fn();
      renderCallback = vi.fn();
    });
    
    it('should add update callback', () => {
      gameLoop.onUpdate(updateCallback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      expect(updateCallback).toHaveBeenCalled();
    });
    
    it('should add render callback', () => {
      gameLoop.onRender(renderCallback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      expect(renderCallback).toHaveBeenCalled();
    });
    
    it('should remove update callback', () => {
      gameLoop.onUpdate(updateCallback);
      gameLoop.removeUpdateCallback(updateCallback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      expect(updateCallback).not.toHaveBeenCalled();
    });
    
    it('should remove render callback', () => {
      gameLoop.onRender(renderCallback);
      gameLoop.removeRenderCallback(renderCallback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      expect(renderCallback).not.toHaveBeenCalled();
    });
    
    it('should call callbacks with delta time and current time', () => {
      gameLoop.onUpdate(updateCallback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      expect(updateCallback).toHaveBeenCalledWith(expect.any(Number), expect.any(Number));
      const [deltaTime, currentTime] = (updateCallback as any).mock.calls[0];
      expect(deltaTime).toBeGreaterThan(0);
      expect(deltaTime).toBeLessThan(1);
      expect(currentTime).toBeGreaterThan(0);
    });
    
    it('should call update callbacks before render callbacks', () => {
      const callOrder: string[] = [];
      
      gameLoop.onUpdate(() => callOrder.push('update'));
      gameLoop.onRender(() => callOrder.push('render'));
      
      gameLoop.start();
      vi.advanceTimersByTime(17);
      
      expect(callOrder).toEqual(['update', 'render']);
    });
    
    it('should handle multiple callbacks', () => {
      const update1 = vi.fn();
      const update2 = vi.fn();
      const render1 = vi.fn();
      const render2 = vi.fn();
      
      gameLoop.onUpdate(update1);
      gameLoop.onUpdate(update2);
      gameLoop.onRender(render1);
      gameLoop.onRender(render2);
      
      gameLoop.start();
      vi.advanceTimersByTime(17);
      
      expect(update1).toHaveBeenCalled();
      expect(update2).toHaveBeenCalled();
      expect(render1).toHaveBeenCalled();
      expect(render2).toHaveBeenCalled();
    });
  });
  
  describe('Performance Metrics', () => {
    beforeEach(() => {
      gameLoop = new GameLoop({ enablePerformanceMonitoring: true });
    });
    
    it('should track FPS', () => {
      gameLoop.start();
      
      // Simulate multiple frames
      for (let i = 0; i < 60; i++) {
        vi.advanceTimersByTime(16.67);
      }
      
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics.fps).toBeGreaterThan(0);
      expect(metrics.fps).toBeLessThanOrEqual(60);
    });
    
    it('should track frame count', () => {
      gameLoop.start();
      
      // Simulate 10 frames
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(16.67);
      }
      
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics.frameCount).toBeGreaterThan(0);
      expect(metrics.averageFps).toBeGreaterThan(0);
    });
    
    it('should track delta time', () => {
      gameLoop.start();
      vi.advanceTimersByTime(16.67);
      
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics.deltaTime).toBeGreaterThan(0);
      expect(metrics.deltaTime).toBeLessThan(1);
    });
    
    it('should return zero metrics when not running', () => {
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics.fps).toBe(0);
      expect(metrics.frameCount).toBe(0);
      expect(metrics.deltaTime).toBe(0);
    });
    
    it('should handle performance monitoring disabled', () => {
      gameLoop = new GameLoop({ enablePerformanceMonitoring: false });
      gameLoop.start();
      vi.advanceTimersByTime(100);
      
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics).toBeDefined();
    });
  });
  
  describe('Frame Timing', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should maintain consistent frame timing', () => {
      const deltaTimes: number[] = [];
      gameLoop.onUpdate((dt) => deltaTimes.push(dt));
      
      gameLoop.start();
      
      // Simulate 10 frames at 60 FPS
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(16.67);
      }
      
      // Check that delta times are consistent (around 0.01667 seconds)
      deltaTimes.forEach(dt => {
        expect(dt).toBeGreaterThan(0.015);
        expect(dt).toBeLessThan(0.020);
      });
    });
    
    it('should handle variable frame rates', () => {
      const deltaTimes: number[] = [];
      gameLoop.onUpdate((dt) => deltaTimes.push(dt));
      
      gameLoop.start();
      
      // Simulate variable frame timing
      vi.advanceTimersByTime(16.67);  // Normal frame
      vi.advanceTimersByTime(33.33);  // Slow frame (30 FPS)
      vi.advanceTimersByTime(8.33);   // Fast frame (120 FPS)
      
      expect(deltaTimes.length).toBeGreaterThan(0);
      expect(Math.max(...deltaTimes)).toBeGreaterThan(Math.min(...deltaTimes));
    });
    
    it('should cap delta time to prevent spiral of death', () => {
      gameLoop.onUpdate((dt) => {
        // Delta time should be capped at 1/30 second
        expect(dt).toBeLessThanOrEqual(1/30 + 0.001); // Small margin for float precision
      });
      
      gameLoop.start();
      
      // Simulate a very long frame (100ms)
      vi.advanceTimersByTime(100);
    });
  });
  
  describe('Pause Behavior', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should not call callbacks when paused', () => {
      const updateCallback = vi.fn();
      const renderCallback = vi.fn();
      
      gameLoop.onUpdate(updateCallback);
      gameLoop.onRender(renderCallback);
      
      gameLoop.start();
      vi.advanceTimersByTime(17);
      
      const initialUpdateCalls = updateCallback.mock.calls.length;
      const initialRenderCalls = renderCallback.mock.calls.length;
      
      gameLoop.pause();
      vi.advanceTimersByTime(100);
      
      // Should not have been called more times while paused
      expect(updateCallback.mock.calls.length).toBe(initialUpdateCalls);
      expect(renderCallback.mock.calls.length).toBe(initialRenderCalls);
    });
    
    it('should resume correctly after pause', () => {
      const updateCallback = vi.fn();
      
      gameLoop.onUpdate(updateCallback);
      gameLoop.start();
      
      vi.advanceTimersByTime(17);
      const callsBeforePause = updateCallback.mock.calls.length;
      
      gameLoop.pause();
      vi.advanceTimersByTime(100);
      
      gameLoop.resume();
      vi.advanceTimersByTime(17);
      
      expect(updateCallback.mock.calls.length).toBeGreaterThan(callsBeforePause);
    });
    
    it('should reset timing after resume to prevent large delta', () => {
      const deltaTimes: number[] = [];
      gameLoop.onUpdate((dt) => deltaTimes.push(dt));
      
      gameLoop.start();
      vi.advanceTimersByTime(17); // First frame
      
      gameLoop.pause();
      vi.advanceTimersByTime(1000); // Long pause
      
      gameLoop.resume();
      vi.advanceTimersByTime(17); // Frame after resume
      
      // Delta time after resume should be normal, not 1 second
      const deltaAfterResume = deltaTimes[deltaTimes.length - 1];
      expect(deltaAfterResume).toBeLessThan(0.1);
    });
  });
  
  describe('Error Handling', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should handle callback errors gracefully', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();
      
      gameLoop.onUpdate(errorCallback);
      gameLoop.onUpdate(normalCallback);
      
      // Mock console.error to prevent test output pollution
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        gameLoop.start();
        vi.advanceTimersByTime(17);
      }).not.toThrow();
      
      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleError).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });
    
    it('should continue running after callback error', () => {
      let callCount = 0;
      const errorCallback = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Test error');
        }
      });
      
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      gameLoop.onUpdate(errorCallback);
      gameLoop.start();
      
      vi.advanceTimersByTime(17); // First frame - error
      vi.advanceTimersByTime(17); // Second frame - should still run
      
      expect(errorCallback).toHaveBeenCalledTimes(2);
      
      consoleError.mockRestore();
    });
  });
  
  describe('Memory Management', () => {
    it('should clean up on stop', () => {
      gameLoop = new GameLoop();
      const callback = vi.fn();
      
      gameLoop.onUpdate(callback);
      gameLoop.start();
      vi.advanceTimersByTime(17);
      
      gameLoop.stop();
      callback.mockClear();
      
      // Should not call callback after stop even if time advances
      vi.advanceTimersByTime(100);
      expect(callback).not.toHaveBeenCalled();
    });
    
    it('should not accumulate FPS buffer indefinitely', () => {
      gameLoop = new GameLoop({ enablePerformanceMonitoring: true });
      gameLoop.start();
      
      // Simulate many frames
      for (let i = 0; i < 200; i++) {
        vi.advanceTimersByTime(16.67);
      }
      
      // Buffer should be limited (implementation limits to 60 samples)
      const metrics = gameLoop.getPerformanceMetrics();
      expect(metrics).toBeDefined();
      // Can't directly test buffer size, but loop should still be performant
      expect(metrics.averageFps).toBeGreaterThan(0);
    });
  });
  
  describe('Edge Cases', () => {
    beforeEach(() => {
      gameLoop = new GameLoop();
    });
    
    it('should handle rapid start/stop cycles', () => {
      for (let i = 0; i < 10; i++) {
        gameLoop.start();
        vi.advanceTimersByTime(5);
        gameLoop.stop();
      }
      
      expect(gameLoop.isRunning()).toBe(false);
    });
    
    it('should handle rapid pause/resume cycles', () => {
      gameLoop.start();
      
      for (let i = 0; i < 10; i++) {
        gameLoop.pause();
        gameLoop.resume();
      }
      
      expect(gameLoop.isPaused()).toBe(false);
      expect(gameLoop.isRunning()).toBe(true);
    });
    
    it('should handle removing callback during iteration', () => {
      const callbacks: GameLoopCallback[] = [];
      
      // Create callback that removes itself
      const selfRemovingCallback: GameLoopCallback = (dt) => {
        gameLoop.removeUpdateCallback(selfRemovingCallback);
      };
      
      callbacks.push(selfRemovingCallback);
      callbacks.push(vi.fn()); // Normal callback
      
      callbacks.forEach(cb => gameLoop.onUpdate(cb));
      
      gameLoop.start();
      expect(() => vi.advanceTimersByTime(17)).not.toThrow();
    });
    
    it('should handle adding callback during iteration', () => {
      const newCallback = vi.fn();
      
      const addingCallback: GameLoopCallback = () => {
        gameLoop.onUpdate(newCallback);
      };
      
      gameLoop.onUpdate(addingCallback);
      gameLoop.start();
      
      vi.advanceTimersByTime(17); // First frame adds new callback
      vi.advanceTimersByTime(17); // Second frame should call new callback
      
      expect(newCallback).toHaveBeenCalled();
    });
  });
});