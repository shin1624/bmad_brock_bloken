import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameCanvas } from './GameCanvas';

interface GameProps {
  onBack?: () => void;
}

interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  destroyed: boolean;
}

export const Game: React.FC<GameProps> = ({ onBack }) => {
  // Game state
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameOver'>('ready');

  // Game entities
  const [paddle, setPaddle] = useState({ x: 350, y: 550, width: 100, height: 10 });
  const [ball, setBall] = useState({ x: 400, y: 300, vx: 4, vy: -4, radius: 8 });
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Refs for game loop
  const animationRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  // Initialize blocks
  useEffect(() => {
    const newBlocks: Block[] = [];
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA500', '#98D8C8'];

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 10; col++) {
        newBlocks.push({
          x: col * 75 + 30,
          y: row * 30 + 50,
          width: 70,
          height: 25,
          color: colors[row % colors.length],
          destroyed: false
        });
      }
    }

    setBlocks(newBlocks);
  }, []);

  // Handle canvas ready
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    canvasRef.current = canvas;
    contextRef.current = context;

    // Set up canvas properties
    context.font = '20px Arial';
    context.textAlign = 'center';

    // Initial render
    render();
  }, []);

  // Render game
  const render = useCallback(() => {
    const ctx = contextRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw blocks
    blocks.forEach(block => {
      if (!block.destroyed) {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.width, block.height);

        // Add block border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeRect(block.x, block.y, block.width, block.height);
      }
    });

    // Draw paddle
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD700';
    ctx.fill();
    ctx.closePath();

    // Draw UI
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.textAlign = 'right';
    ctx.fillText(`Lives: ${lives}`, 790, 30);

    // Draw game state messages
    ctx.textAlign = 'center';
    ctx.font = '30px Arial';

    if (gameState === 'ready') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('Press SPACE to Start', 400, 350);
      ctx.font = '16px Arial';
      ctx.fillText('Use Arrow Keys or Mouse to Move', 400, 380);
    } else if (gameState === 'paused') {
      ctx.fillStyle = '#FFFF00';
      ctx.fillText('PAUSED', 400, 350);
      ctx.font = '16px Arial';
      ctx.fillText('Press SPACE to Resume', 400, 380);
    } else if (gameState === 'gameOver') {
      ctx.fillStyle = '#FF0000';
      ctx.fillText('GAME OVER', 400, 350);
      ctx.font = '16px Arial';
      ctx.fillText(`Final Score: ${score}`, 400, 380);
      ctx.fillText('Press SPACE to Play Again', 400, 410);
    }
  }, [blocks, paddle, ball, score, lives, gameState]);

  // Check collision between ball and rectangle
  const checkCollision = (ballX: number, ballY: number, ballRadius: number,
                          rectX: number, rectY: number, rectW: number, rectH: number) => {
    const closestX = Math.max(rectX, Math.min(ballX, rectX + rectW));
    const closestY = Math.max(rectY, Math.min(ballY, rectY + rectH));

    const distanceX = ballX - closestX;
    const distanceY = ballY - closestY;

    return (distanceX * distanceX + distanceY * distanceY) < (ballRadius * ballRadius);
  };

  // Update game logic
  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return;

    // Update paddle position based on keys
    if (keysPressed.current.has('ArrowLeft') && paddle.x > 0) {
      setPaddle(prev => ({ ...prev, x: Math.max(0, prev.x - 8) }));
    }
    if (keysPressed.current.has('ArrowRight') && paddle.x < 700) {
      setPaddle(prev => ({ ...prev, x: Math.min(700, prev.x + 8) }));
    }

    // Update ball position
    setBall(prevBall => {
      let newX = prevBall.x + prevBall.vx;
      let newY = prevBall.y + prevBall.vy;
      let newVx = prevBall.vx;
      let newVy = prevBall.vy;

      // Wall collisions
      if (newX - prevBall.radius <= 0 || newX + prevBall.radius >= 800) {
        newVx = -newVx;
        newX = newX - prevBall.radius <= 0 ? prevBall.radius : 800 - prevBall.radius;
      }

      if (newY - prevBall.radius <= 0) {
        newVy = -newVy;
        newY = prevBall.radius;
      }

      // Bottom boundary - lose life
      if (newY + prevBall.radius >= 600) {
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
          } else {
            // Reset ball position
            setBall({ x: 400, y: 300, vx: 4, vy: -4, radius: 8 });
            setGameState('ready');
          }
          return newLives;
        });
        return prevBall;
      }

      // Paddle collision
      if (checkCollision(newX, newY, prevBall.radius,
                         paddle.x, paddle.y, paddle.width, paddle.height)) {
        newVy = -Math.abs(newVy);

        // Add some angle based on where ball hits paddle
        const hitPos = (newX - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        newVx = hitPos * 5;
      }

      // Block collisions
      blocks.forEach((block, index) => {
        if (!block.destroyed &&
            checkCollision(newX, newY, prevBall.radius,
                          block.x, block.y, block.width, block.height)) {
          setBlocks(prev => {
            const newBlocks = [...prev];
            newBlocks[index] = { ...block, destroyed: true };
            return newBlocks;
          });

          setScore(prev => prev + 10);
          newVy = -newVy;

          // Check win condition
          if (blocks.filter(b => !b.destroyed).length === 1) {
            setGameState('gameOver');
          }
        }
      });

      return { x: newX, y: newY, vx: newVx, vy: newVy, radius: prevBall.radius };
    });
  }, [gameState, paddle.x, paddle.y, paddle.width, paddle.height, blocks]);

  // Game loop
  useEffect(() => {
    const gameLoop = () => {
      updateGame();
      render();
      animationRef.current = requestAnimationFrame(gameLoop);
    };

    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, updateGame, render]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key);

      if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (gameState === 'ready') {
          setGameState('playing');
        } else if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        } else if (gameState === 'gameOver') {
          // Reset game
          setScore(0);
          setLives(3);
          setBall({ x: 400, y: 300, vx: 4, vy: -4, radius: 8 });
          setPaddle({ x: 350, y: 550, width: 100, height: 10 });

          // Reset blocks
          const newBlocks: Block[] = [];
          const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA500', '#98D8C8'];

          for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 10; col++) {
              newBlocks.push({
                x: col * 75 + 30,
                y: row * 30 + 50,
                width: 70,
                height: 25,
                color: colors[row % colors.length],
                destroyed: false
              });
            }
          }
          setBlocks(newBlocks);
          setGameState('ready');
        }
      }

      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, onBack]);

  // Handle mouse input
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const scaleX = canvas.width / rect.width;

      setPaddle(prev => ({
        ...prev,
        x: Math.max(0, Math.min(700, (x * scaleX) - prev.width / 2))
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          Back to Menu
        </button>
      </div>

      <div className="border-2 border-gray-700 rounded-lg overflow-hidden">
        <GameCanvas
          width={800}
          height={600}
          onCanvasReady={handleCanvasReady}
          autoResize={false}
          className="bg-black"
        />
      </div>

      <div className="mt-4 text-white text-center">
        <p className="text-sm">Use Arrow Keys or Mouse to move • Space to start/pause • ESC to quit</p>
      </div>
    </div>
  );
};

export default Game;
