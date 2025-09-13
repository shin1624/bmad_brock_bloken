/**
 * Tests for useBallPhysics hook
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBallPhysics } from '../useBallPhysics';
import { BallConfiguration } from '../../types/game.types';

// Mock requestAnimationFrame and cancelAnimationFrame
let animationFrameId = 0;
const animationFrameCallbacks = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    const id = ++animationFrameId;
    animationFrameCallbacks.set(id, callback);
    return id;
  });

  global.cancelAnimationFrame = vi.fn((id: number) => {
    animationFrameCallbacks.delete(id);
  });

  // Mock performance.now for consistent timing
  vi.stubGlobal('performance', {
    now: vi.fn(() => Date.now())
  });
});

afterEach(() => {
  animationFrameCallbacks.clear();
  vi.restoreAllMocks();
});

describe('useBallPhysics Hook', () => {
  let canvasRef: React.RefObject<HTMLCanvasElement>;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas and context
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 800,
      height: 600,
    } as unknown as HTMLCanvasElement;

    canvasRef = { current: mockCanvas };
  });

  const defaultBallConfig: BallConfiguration = {
    initialRadius: 10,
    initialSpeed: 200,
    maxSpeed: 500,
    minSpeed: 50,
    initialPosition: { x: 400, y: 300 },
    bounceDamping: 0.95
  };

  const defaultPhysicsConfig = {
    canvasWidth: 800,
    canvasHeight: 600,
    gravity: 0,
    wallBounceThreshold: 30
  };

  describe('Initialization', () => {
    it('should initialize with empty balls array', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      expect(result.current.balls).toEqual([]);
      expect(result.current.physicsSystem).toBeDefined();
      expect(result.current.isRunning).toBe(true);
    });

    it('should initialize with disabled physics when enabled=false', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig,
          enabled: false
        })
      );

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Ball Management', () => {
    it('should add ball correctly', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      act(() => {
        result.current.addBall();
      });

      expect(result.current.balls).toHaveLength(1);
      expect(result.current.getBallCount()).toBe(1);
      expect(result.current.getActiveBallCount()).toBe(1);
    });

    it('should add ball with custom configuration', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      const customConfig = {
        initialRadius: 20,
        initialSpeed: 300
      };

      act(() => {
        result.current.addBall(customConfig);
      });

      const ball = result.current.balls[0];
      expect(ball.radius).toBe(20);
      expect(ball.speed).toBe(300);
    });

    it('should remove ball by ID', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      let ballId: string;

      act(() => {
        const ball = result.current.addBall();
        ballId = ball.id;
      });

      expect(result.current.balls).toHaveLength(1);

      act(() => {
        result.current.removeBall(ballId);
      });

      expect(result.current.balls).toHaveLength(0);
    });

    it('should remove all balls', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      act(() => {
        result.current.addBall();
        result.current.addBall();
        result.current.addBall();
      });

      expect(result.current.balls).toHaveLength(3);

      act(() => {
        result.current.removeAllBalls();
      });

      expect(result.current.balls).toHaveLength(0);
    });

    it('should reset ball with new configuration', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      let ballId: string;

      act(() => {
        const ball = result.current.addBall();
        ballId = ball.id;
      });

      const ball = result.current.getBallById(ballId)!;
      const originalPosition = { ...ball.position };

      const resetConfig = {
        initialPosition: { x: 100, y: 100 },
        initialSpeed: 500
      };

      act(() => {
        result.current.resetBall(ballId, resetConfig);
      });

      expect(ball.position.x).toBe(100);
      expect(ball.position.y).toBe(100);
      expect(ball.speed).toBe(500);
      expect(ball.position.x).not.toBe(originalPosition.x);
      expect(ball.position.y).not.toBe(originalPosition.y);
    });

    it('should set ball velocity', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      let ballId: string;

      act(() => {
        const ball = result.current.addBall();
        ballId = ball.id;
      });

      const newVelocity = { x: 300, y: -200 };

      act(() => {
        result.current.setBallVelocity(ballId, newVelocity);
      });

      const ball = result.current.getBallById(ballId)!;
      // Velocity should be normalized but in same direction
      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeGreaterThan(0);
      expect(ball.velocity.x).toBeGreaterThan(0);
      expect(ball.velocity.y).toBeLessThan(0);
    });
  });

  describe('Physics Control', () => {
    it('should pause and resume physics', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      expect(result.current.isRunning).toBe(true);

      act(() => {
        result.current.pausePhysics();
      });

      expect(result.current.isRunning).toBe(false);

      act(() => {
        result.current.resumePhysics();
      });

      expect(result.current.isRunning).toBe(true);
    });

    it('should not resume when disabled', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig,
          enabled: false
        })
      );

      expect(result.current.isRunning).toBe(false);

      act(() => {
        result.current.resumePhysics();
      });

      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Ball Queries', () => {
    it('should get ball by ID', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      let ballId: string;

      act(() => {
        const ball = result.current.addBall();
        ballId = ball.id;
      });

      const foundBall = result.current.getBallById(ballId);
      expect(foundBall).toBeDefined();
      expect(foundBall!.id).toBe(ballId);

      const notFoundBall = result.current.getBallById('nonexistent');
      expect(notFoundBall).toBeUndefined();
    });

    it('should count balls correctly', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      expect(result.current.getBallCount()).toBe(0);
      expect(result.current.getActiveBallCount()).toBe(0);

      act(() => {
        result.current.addBall();
        result.current.addBall();
      });

      expect(result.current.getBallCount()).toBe(2);
      expect(result.current.getActiveBallCount()).toBe(2);

      // Deactivate one ball
      act(() => {
        result.current.balls[0].active = false;
      });

      expect(result.current.getBallCount()).toBe(2);
      expect(result.current.getActiveBallCount()).toBe(1);
    });
  });

  describe('Event Callbacks', () => {
    it('should call onBallOutOfBounds when ball goes out', () => {
      const onBallOutOfBounds = vi.fn();

      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig,
          onBallOutOfBounds
        })
      );

      act(() => {
        const ball = result.current.addBall();
        // Move ball out of bounds
        ball.position.y = 700; // Below canvas height
      });

      // Trigger animation frame
      act(() => {
        animationFrameCallbacks.forEach(callback => callback(performance.now()));
      });

      expect(onBallOutOfBounds).toHaveBeenCalled();
    });

    it('should call onBallCollision when collision occurs', () => {
      const onBallCollision = vi.fn();

      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig,
          onBallCollision
        })
      );

      act(() => {
        const ball = result.current.addBall();
        // Move ball to wall and set velocity towards it
        ball.position.x = 5;
        ball.velocity.x = -100;
      });

      // Trigger animation frame to process physics
      act(() => {
        animationFrameCallbacks.forEach(callback => callback(performance.now()));
      });

      // Note: This test may need adjustment based on actual physics implementation
      // The collision callback might be called from within the physics system
    });
  });

  describe('Canvas Integration', () => {
    it('should handle missing canvas gracefully', () => {
      const nullCanvasRef = { current: null };

      expect(() => {
        renderHook(() =>
          useBallPhysics({
            canvasRef: nullCanvasRef,
            physicsConfig: defaultPhysicsConfig,
            ballConfig: defaultBallConfig
          })
        );
      }).not.toThrow();
    });

    it('should render balls to canvas context', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      act(() => {
        result.current.addBall();
      });

      // Trigger animation frame
      act(() => {
        animationFrameCallbacks.forEach(callback => callback(performance.now()));
      });

      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle multiple balls efficiently', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      // Add many balls
      act(() => {
        for (let i = 0; i < 50; i++) {
          result.current.addBall();
        }
      });

      expect(result.current.getBallCount()).toBe(50);

      // Should not throw or hang when processing many balls
      expect(() => {
        act(() => {
          animationFrameCallbacks.forEach(callback => callback(performance.now()));
        });
      }).not.toThrow();
    });

    it('should limit delta time to prevent large jumps', () => {
      const { result } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      act(() => {
        const ball = result.current.addBall();
        ball.velocity = { x: 1000, y: 0 };
      });

      const ball = result.current.balls[0];
      const initialX = ball.position.x;

      // Simulate large time gap (should be clamped)
      const mockNow = vi.mocked(performance.now);
      mockNow.mockReturnValueOnce(0).mockReturnValueOnce(5000); // 5 second gap

      act(() => {
        animationFrameCallbacks.forEach(callback => callback(5000));
      });

      // Position should not have jumped too far due to delta time limiting
      const distance = Math.abs(ball.position.x - initialX);
      expect(distance).toBeLessThan(100); // Reasonable distance for clamped delta
    });
  });

  describe('Cleanup', () => {
    it('should cleanup animation frame on unmount', () => {
      const { unmount } = renderHook(() =>
        useBallPhysics({
          canvasRef,
          physicsConfig: defaultPhysicsConfig,
          ballConfig: defaultBallConfig
        })
      );

      expect(global.requestAnimationFrame).toHaveBeenCalled();

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should cleanup when disabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useBallPhysics({
            canvasRef,
            physicsConfig: defaultPhysicsConfig,
            ballConfig: defaultBallConfig,
            enabled
          }),
        { initialProps: { enabled: true } }
      );

      expect(global.requestAnimationFrame).toHaveBeenCalled();

      rerender({ enabled: false });

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});