/**
 * Ball physics demonstration component
 * Combines canvas rendering with ball physics controls
 */
import React, { useRef, useEffect } from 'react';
import { useBallPhysics } from '../../hooks/useBallPhysics';
import { BallControls } from './BallControls';
import { BallConfiguration } from '../../types/game.types';

export interface BallPhysicsDemoProps {
  canvasWidth?: number;
  canvasHeight?: number;
  className?: string;
}

export const BallPhysicsDemo: React.FC<BallPhysicsDemoProps> = ({
  canvasWidth = 800,
  canvasHeight = 600,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Default ball configuration
  const defaultBallConfig: BallConfiguration = {
    initialRadius: 10,
    initialSpeed: 200,
    maxSpeed: 500,
    minSpeed: 50,
    initialPosition: { x: canvasWidth / 2, y: canvasHeight / 2 },
    bounceDamping: 0.95
  };

  // Physics configuration
  const physicsConfig = {
    canvasWidth,
    canvasHeight,
    gravity: 0, // No gravity for classic breakout feel
    wallBounceThreshold: 30
  };

  // Ball physics hook
  const {
    balls,
    isRunning,
    addBall,
    removeBall,
    removeAllBalls,
    resetBall,
    setBallVelocity,
    pausePhysics,
    resumePhysics
  } = useBallPhysics({
    canvasRef,
    physicsConfig,
    ballConfig: defaultBallConfig,
    enabled: true,
    onBallOutOfBounds: (ball) => {
      console.log(`Ball ${ball.id} went out of bounds`);
      // In a real game, this would trigger life loss
    },
    onBallCollision: (ball, normal) => {
      console.log(`Ball ${ball.id} collided with normal:`, normal);
      // In a real game, this would trigger sound effects, scoring, etc.
    }
  });

  // Canvas rendering setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Initial canvas clear and border
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

      // Draw center line (optional)
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(canvasWidth / 2, 0);
      ctx.lineTo(canvasWidth / 2, canvasHeight);
      ctx.stroke();

      // Draw ground line
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvasHeight - 5);
      ctx.lineTo(canvasWidth, canvasHeight - 5);
      ctx.stroke();
    };

    render();

    // Re-render when physics pauses/resumes
    if (!isRunning) {
      const interval = setInterval(render, 100);
      return () => clearInterval(interval);
    }
  }, [canvasWidth, canvasHeight, isRunning]);

  return (
    <div className={`flex gap-4 ${className}`}>
      {/* Canvas Area */}
      <div className="flex-1">
        <div className="mb-2">
          <h2 className="text-xl font-bold">Ball Physics Demo</h2>
          <p className="text-gray-600">
            Canvas size: {canvasWidth}x{canvasHeight} | 
            Physics: {isRunning ? 'Running' : 'Paused'} | 
            Balls: {balls.length}
          </p>
        </div>
        <canvas
          ref={canvasRef}
          className="border border-gray-300 bg-gray-900"
          style={{
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>

      {/* Control Panel */}
      <div className="w-80">
        <BallControls
          balls={balls}
          isPhysicsRunning={isRunning}
          onAddBall={addBall}
          onRemoveBall={removeBall}
          onRemoveAllBalls={removeAllBalls}
          onResetBall={resetBall}
          onSetBallVelocity={setBallVelocity}
          onPausePhysics={pausePhysics}
          onResumePhysics={resumePhysics}
        />
      </div>
    </div>
  );
};