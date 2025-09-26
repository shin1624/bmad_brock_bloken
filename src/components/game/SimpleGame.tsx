import React, { useRef, useEffect, useState } from 'react';

interface SimpleGameProps {
  onBack?: () => void;
}

export const SimpleGame: React.FC<SimpleGameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'paused' | 'gameOver'>('ready');
  
  // Game state
  const [paddleX, setPaddleX] = useState(350);
  const [ballPosition, setBallPosition] = useState({ x: 400, y: 300 });
  const [ballVelocity, setBallVelocity] = useState({ x: 3, y: -3 });
  const [blocks, setBlocks] = useState<Array<{ x: number; y: number; width: number; height: number; color: string; destroyed: boolean }>>([]);
  
  // Initialize blocks
  useEffect(() => {
    const newBlocks = [];
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
  
  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const gameLoop = setInterval(() => {
      setBallPosition(prev => {
        let newX = prev.x + ballVelocity.x;
        let newY = prev.y + ballVelocity.y;
        
        // Wall collisions
        if (newX <= 10 || newX >= 790) {
          setBallVelocity(v => ({ ...v, x: -v.x }));
          newX = newX <= 10 ? 10 : 790;
        }
        
        if (newY <= 10) {
          setBallVelocity(v => ({ ...v, y: -v.y }));
          newY = 10;
        }
        
        // Bottom wall - lose life
        if (newY >= 590) {
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameOver');
            }
            return newLives;
          });
          return { x: 400, y: 300 };
        }
        
        // Paddle collision
        if (
          newY >= 540 && newY <= 550 &&
          newX >= paddleX && newX <= paddleX + 100
        ) {
          setBallVelocity(v => ({ ...v, y: -Math.abs(v.y) }));
          newY = 540;
        }
        
        return { x: newX, y: newY };
      });
      
      // Block collisions
      setBlocks(prevBlocks => {
        return prevBlocks.map(block => {
          if (!block.destroyed &&
              ballPosition.x >= block.x &&
              ballPosition.x <= block.x + block.width &&
              ballPosition.y >= block.y &&
              ballPosition.y <= block.y + block.height) {
            setBallVelocity(v => ({ ...v, y: -v.y }));
            setScore(s => s + 10);
            return { ...block, destroyed: true };
          }
          return block;
        });
      });
    }, 16);
    
    return () => clearInterval(gameLoop);
  }, [gameState, paddleX, ballVelocity]);
  
  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 800, 600);
    
    // Draw blocks
    blocks.forEach(block => {
      if (!block.destroyed) {
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // Block border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(block.x, block.y, block.width, block.height);
      }
    });
    
    // Draw paddle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(paddleX, 550, 100, 15);
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(ballPosition.x, ballPosition.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#FFD93D';
    ctx.fill();
    ctx.closePath();
    
    // Draw HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px Arial';
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`Lives: ${lives}`, 700, 30);
    
    if (gameState === 'ready') {
      ctx.font = '30px Arial';
      ctx.fillText('Press SPACE to Start', 250, 300);
    }
    
    if (gameState === 'paused') {
      ctx.font = '30px Arial';
      ctx.fillText('PAUSED', 350, 300);
    }
    
    if (gameState === 'gameOver') {
      ctx.font = '40px Arial';
      ctx.fillText('GAME OVER', 280, 300);
      ctx.font = '20px Arial';
      ctx.fillText(`Final Score: ${score}`, 320, 340);
    }
  }, [blocks, paddleX, ballPosition, score, lives, gameState]);
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === ' ' && gameState === 'ready') {
        setGameState('playing');
      } else if (e.key === 'Escape' && gameState === 'playing') {
        setGameState('paused');
      } else if (e.key === 'Escape' && gameState === 'paused') {
        setGameState('playing');
      } else if (e.key === 'ArrowLeft' && paddleX > 0) {
        setPaddleX(prev => Math.max(0, prev - 20));
      } else if (e.key === 'ArrowRight' && paddleX < 700) {
        setPaddleX(prev => Math.min(700, prev + 20));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, paddleX]);
  
  // Mouse controls
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      setPaddleX(Math.max(0, Math.min(700, x - 50)));
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="mb-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
        >
          ← Back to Menu
        </button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border-2 border-gray-700 cursor-none"
        onMouseMove={handleMouseMove}
      />
      
      <div className="mt-4 text-white text-center">
        <p>Use Arrow Keys or Mouse to move paddle</p>
        <p>Press SPACE to start • ESC to pause</p>
      </div>
    </div>
  );
};