/**
 * React hook for managing ball physics and rendering
 * Integrates Ball entity with React lifecycle and canvas updates
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Ball } from '../game/entities/Ball';
import { PhysicsSystem, PhysicsConfig } from '../game/physics/PhysicsSystem';
import { BallConfiguration, Vector2D } from '../types/game.types';

export interface UseBallPhysicsOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  physicsConfig: PhysicsConfig;
  ballConfig: BallConfiguration;
  enabled?: boolean;
  onBallOutOfBounds?: (ball: Ball) => void;
  onBallCollision?: (ball: Ball, normal: Vector2D) => void;
}

export interface BallPhysicsState {
  balls: Ball[];
  physicsSystem: PhysicsSystem | null;
  isRunning: boolean;
}

export function useBallPhysics(options: UseBallPhysicsOptions) {
  const {
    canvasRef,
    physicsConfig,
    ballConfig,
    enabled = true,
    onBallOutOfBounds,
    onBallCollision
  } = options;

  // Core state
  const [state, setState] = useState<BallPhysicsState>({
    balls: [],
    physicsSystem: null,
    isRunning: false
  });

  // Refs for stable references
  const physicsSystemRef = useRef<PhysicsSystem | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Initialize physics system
  useEffect(() => {
    const physicsSystem = new PhysicsSystem(physicsConfig);
    physicsSystemRef.current = physicsSystem;
    setState(prev => ({ ...prev, physicsSystem }));

    return () => {
      physicsSystemRef.current = null;
    };
  }, [physicsConfig]);

  // Update physics config when changed
  useEffect(() => {
    if (physicsSystemRef.current) {
      physicsSystemRef.current.updateConfig(physicsConfig);
    }
  }, [physicsConfig]);

  // Animation loop
  const animate = useCallback((currentTime: number) => {
    if (!enabled || !physicsSystemRef.current || !canvasRef.current) {
      return;
    }

    const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0;
    lastTimeRef.current = currentTime;

    // Limit delta time to prevent large jumps
    const clampedDeltaTime = Math.min(deltaTime, 1/30); // Max 30 FPS minimum

    // Update physics
    physicsSystemRef.current.update(clampedDeltaTime);

    // Check for out-of-bounds balls
    if (onBallOutOfBounds) {
      ballsRef.current.forEach(ball => {
        if (physicsSystemRef.current!.isBallOutOfBounds(ball)) {
          onBallOutOfBounds(ball);
        }
      });
    }

    // Render balls
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Clear ball layer (assuming transparent background)
      ballsRef.current.forEach(ball => {
        const bounds = ball.getBounds();
        ctx.clearRect(
          bounds.x - 2,
          bounds.y - 2,
          bounds.width + 4,
          bounds.height + 4
        );
        ball.render(ctx);
      });
    }

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [enabled, canvasRef, onBallOutOfBounds]);

  // Start/stop animation loop
  useEffect(() => {
    if (enabled && physicsSystemRef.current) {
      setState(prev => ({ ...prev, isRunning: true }));
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      setState(prev => ({ ...prev, isRunning: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, animate]);

  // Ball management functions
  const addBall = useCallback((config?: Partial<BallConfiguration>) => {
    const finalConfig = { ...ballConfig, ...config };
    const ball = new Ball(finalConfig);

    ballsRef.current.push(ball);
    physicsSystemRef.current?.addBall(ball);

    setState(prev => ({
      ...prev,
      balls: [...prev.balls, ball]
    }));

    return ball;
  }, [ballConfig]);

  const removeBall = useCallback((ballId: string) => {
    const ballIndex = ballsRef.current.findIndex(ball => ball.id === ballId);
    if (ballIndex !== -1) {
      const ball = ballsRef.current[ballIndex];
      physicsSystemRef.current?.removeBall(ball);
      ballsRef.current.splice(ballIndex, 1);

      setState(prev => ({
        ...prev,
        balls: prev.balls.filter(b => b.id !== ballId)
      }));
    }
  }, []);

  const removeAllBalls = useCallback(() => {
    ballsRef.current.forEach(ball => {
      physicsSystemRef.current?.removeBall(ball);
    });
    ballsRef.current.length = 0;

    setState(prev => ({
      ...prev,
      balls: []
    }));
  }, []);

  const resetBall = useCallback((ballId: string, config?: Partial<BallConfiguration>) => {
    const ball = ballsRef.current.find(b => b.id === ballId);
    if (ball) {
      const finalConfig = { ...ballConfig, ...config };
      ball.reset(finalConfig);
    }
  }, [ballConfig]);

  const setBallVelocity = useCallback((ballId: string, velocity: Vector2D) => {
    const ball = ballsRef.current.find(b => b.id === ballId);
    if (ball) {
      ball.setVelocity(velocity);
    }
  }, []);

  const getBallById = useCallback((ballId: string): Ball | undefined => {
    return ballsRef.current.find(b => b.id === ballId);
  }, []);

  const getBallCount = useCallback((): number => {
    return ballsRef.current.length;
  }, []);

  const getActiveBallCount = useCallback((): number => {
    return ballsRef.current.filter(ball => ball.active).length;
  }, []);

  // Physics control functions
  const pausePhysics = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const resumePhysics = useCallback(() => {
    if (enabled && physicsSystemRef.current) {
      setState(prev => ({ ...prev, isRunning: true }));
      lastTimeRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [enabled, animate]);

  return {
    // State
    balls: state.balls,
    physicsSystem: state.physicsSystem,
    isRunning: state.isRunning,

    // Ball management
    addBall,
    removeBall,
    removeAllBalls,
    resetBall,
    setBallVelocity,
    getBallById,
    getBallCount,
    getActiveBallCount,

    // Physics control
    pausePhysics,
    resumePhysics
  };
}