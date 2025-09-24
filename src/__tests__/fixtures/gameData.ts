/**
 * Test Data Fixtures
 * Common test data structures for game testing
 */

import type { Position } from '@/types/game.types';
import type { Ball, Paddle, Block, PowerUp } from '@/game/entities';
import type { GameState, GameConfig } from '@/game/core/GameState';
import type { Level } from '@/types/level.types';

/**
 * Creates a mock position
 */
export const createMockPosition = (overrides?: Partial<Position>): Position => ({
  x: 0,
  y: 0,
  ...overrides
});

/**
 * Creates a mock ball entity
 */
export const createMockBall = (overrides?: Partial<Ball>): Ball => ({
  id: 'ball-test-1',
  type: 'ball',
  position: createMockPosition({ x: 400, y: 300 }),
  velocity: { x: 2, y: -2 },
  radius: 8,
  speed: 5,
  active: true,
  color: '#FFFFFF',
  trail: [],
  maxSpeed: 15,
  minSpeed: 2,
  ...overrides
} as Ball);

/**
 * Creates a mock paddle entity
 */
export const createMockPaddle = (overrides?: Partial<Paddle>): Paddle => ({
  id: 'paddle-test-1',
  type: 'paddle',
  position: createMockPosition({ x: 400, y: 550 }),
  velocity: { x: 0, y: 0 },
  width: 100,
  height: 20,
  speed: 8,
  color: '#00FF00',
  active: true,
  ...overrides
} as Paddle);

/**
 * Creates a mock block entity
 */
export const createMockBlock = (overrides?: Partial<Block>): Block => ({
  id: 'block-test-1',
  type: 'block',
  position: createMockPosition({ x: 50, y: 50 }),
  width: 60,
  height: 20,
  health: 1,
  maxHealth: 1,
  points: 10,
  color: '#FF0000',
  active: true,
  destructible: true,
  ...overrides
} as Block);

/**
 * Creates a mock power-up entity
 */
export const createMockPowerUp = (overrides?: Partial<PowerUp>): PowerUp => ({
  id: 'powerup-test-1',
  type: 'powerup',
  position: createMockPosition({ x: 200, y: 200 }),
  velocity: { x: 0, y: 2 },
  width: 30,
  height: 30,
  powerUpType: 'multiball',
  duration: 10000,
  active: true,
  color: '#FFD700',
  icon: '⚡',
  ...overrides
} as PowerUp);

/**
 * Creates a mock level
 */
export const createMockLevel = (overrides?: Partial<Level>): Level => ({
  id: 'level-test-1',
  name: 'Test Level',
  difficulty: 1,
  theme: 'classic',
  blocks: [
    createMockBlock({ position: { x: 50, y: 50 } }),
    createMockBlock({ position: { x: 120, y: 50 }, health: 2, maxHealth: 2 }),
    createMockBlock({ position: { x: 190, y: 50 }, health: 3, maxHealth: 3 })
  ],
  powerUps: ['multiball', 'paddlesize'],
  background: '#000000',
  targetScore: 1000,
  timeLimit: null,
  ...overrides
} as Level);

/**
 * Creates a mock game state
 */
export const createMockGameState = (overrides?: Partial<GameState>): GameState => ({
  status: 'idle',
  score: 0,
  lives: 3,
  level: 1,
  balls: [createMockBall()],
  paddle: createMockPaddle(),
  blocks: [],
  powerUps: [],
  activePowerUps: [],
  combo: 0,
  highScore: 0,
  paused: false,
  gameTime: 0,
  fps: 60,
  ...overrides
} as GameState);

/**
 * Creates a mock game configuration
 */
export const createMockGameConfig = (overrides?: Partial<GameConfig>): GameConfig => ({
  canvasWidth: 800,
  canvasHeight: 600,
  maxLives: 3,
  ballSpeed: 5,
  paddleSpeed: 8,
  powerUpChance: 0.1,
  particlesEnabled: true,
  soundEnabled: true,
  theme: 'classic',
  difficulty: 'normal',
  ...overrides
} as GameConfig);

/**
 * Creates multiple blocks in a grid pattern
 */
export const createBlockGrid = (
  rows: number,
  cols: number,
  startX = 50,
  startY = 50,
  spacing = 10
): Block[] => {
  const blocks: Block[] = [];
  const blockWidth = 60;
  const blockHeight = 20;
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + col * (blockWidth + spacing);
      const y = startY + row * (blockHeight + spacing);
      const health = Math.min(3, row + 1); // Higher rows have more health
      
      blocks.push(createMockBlock({
        id: `block-${row}-${col}`,
        position: { x, y },
        health,
        maxHealth: health,
        points: health * 10,
        color: health === 1 ? '#FF0000' : health === 2 ? '#FF8800' : '#FFFF00'
      }));
    }
  }
  
  return blocks;
};

/**
 * Creates a complete game scenario for testing
 */
export const createGameScenario = (scenario: 'start' | 'midgame' | 'endgame' | 'gameover') => {
  switch (scenario) {
    case 'start':
      return createMockGameState({
        status: 'playing',
        blocks: createBlockGrid(3, 8),
        score: 0,
        lives: 3
      });
    
    case 'midgame':
      return createMockGameState({
        status: 'playing',
        blocks: createBlockGrid(2, 5),
        score: 500,
        lives: 2,
        combo: 3,
        activePowerUps: [{
          type: 'multiball',
          duration: 5000,
          startTime: Date.now()
        }]
      });
    
    case 'endgame':
      return createMockGameState({
        status: 'playing',
        blocks: [
          createMockBlock({ position: { x: 400, y: 100 }, health: 1 })
        ],
        score: 2800,
        lives: 1,
        combo: 10
      });
    
    case 'gameover':
      return createMockGameState({
        status: 'gameover',
        blocks: [],
        score: 3000,
        lives: 0,
        highScore: 3000
      });
  }
};

/**
 * Creates test data for collision scenarios
 */
export const createCollisionScenario = (type: 'ball-paddle' | 'ball-block' | 'ball-wall') => {
  const ball = createMockBall();
  
  switch (type) {
    case 'ball-paddle':
      const paddle = createMockPaddle();
      ball.position = { x: paddle.position.x, y: paddle.position.y - 10 };
      ball.velocity = { x: 0, y: 5 };
      return { ball, paddle };
    
    case 'ball-block':
      const block = createMockBlock();
      ball.position = { x: block.position.x + 30, y: block.position.y + 25 };
      ball.velocity = { x: 0, y: -5 };
      return { ball, block };
    
    case 'ball-wall':
      ball.position = { x: 5, y: 300 };
      ball.velocity = { x: -5, y: 0 };
      return { ball, wall: 'left' };
  }
};

/**
 * Creates test data for power-up scenarios
 */
export const createPowerUpScenario = (type: string) => {
  const gameState = createMockGameState({ status: 'playing' });
  const powerUp = createMockPowerUp({ powerUpType: type });
  
  return {
    gameState,
    powerUp,
    paddle: gameState.paddle,
    expectedEffect: getPowerUpEffect(type)
  };
};

function getPowerUpEffect(type: string) {
  switch (type) {
    case 'multiball':
      return { ballCount: 3 };
    case 'paddlesize':
      return { paddleWidth: 150 };
    case 'slowball':
      return { ballSpeed: 2.5 };
    case 'fastball':
      return { ballSpeed: 10 };
    case 'extralife':
      return { lives: 4 };
    default:
      return {};
  }
}