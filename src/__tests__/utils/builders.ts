/**
 * Test Data Builders
 * Builder pattern implementations for complex test data
 */

import { TestDataBuilder } from './testHelpers';
import type { GameState, GameConfig } from '@/game/core/GameState';
import type { Ball, Paddle, Block } from '@/game/entities';
import type { Level } from '@/types/level.types';
import { createMockBall, createMockPaddle, createMockBlock } from '../fixtures/gameData';

/**
 * Builder for GameState test data
 */
export class GameStateBuilder extends TestDataBuilder<GameState> {
  constructor() {
    super();
    // Set defaults
    this.data = {
      status: 'idle',
      score: 0,
      lives: 3,
      level: 1,
      balls: [],
      paddle: createMockPaddle(),
      blocks: [],
      powerUps: [],
      activePowerUps: [],
      combo: 0,
      highScore: 0,
      paused: false,
      gameTime: 0,
      fps: 60
    };
  }
  
  withStatus(status: GameState['status']): this {
    this.data.status = status;
    return this;
  }
  
  withScore(score: number): this {
    this.data.score = score;
    return this;
  }
  
  withLives(lives: number): this {
    this.data.lives = lives;
    return this;
  }
  
  withLevel(level: number): this {
    this.data.level = level;
    return this;
  }
  
  withBalls(...balls: Ball[]): this {
    this.data.balls = balls;
    return this;
  }
  
  withPaddle(paddle: Paddle): this {
    this.data.paddle = paddle;
    return this;
  }
  
  withBlocks(...blocks: Block[]): this {
    this.data.blocks = blocks;
    return this;
  }
  
  withCombo(combo: number): this {
    this.data.combo = combo;
    return this;
  }
  
  playing(): this {
    this.data.status = 'playing';
    if (!this.data.balls?.length) {
      this.data.balls = [createMockBall()];
    }
    return this;
  }
  
  paused(): this {
    this.data.paused = true;
    return this;
  }
  
  gameOver(): this {
    this.data.status = 'gameover';
    this.data.lives = 0;
    return this;
  }
  
  build(): GameState {
    return { ...this.data } as GameState;
  }
}

/**
 * Builder for Level test data
 */
export class LevelBuilder extends TestDataBuilder<Level> {
  constructor() {
    super();
    this.data = {
      id: 'level-test',
      name: 'Test Level',
      difficulty: 1,
      theme: 'classic',
      blocks: [],
      powerUps: [],
      background: '#000000',
      targetScore: 1000,
      timeLimit: null
    };
  }
  
  withId(id: string): this {
    this.data.id = id;
    return this;
  }
  
  withName(name: string): this {
    this.data.name = name;
    return this;
  }
  
  withDifficulty(difficulty: number): this {
    this.data.difficulty = difficulty;
    return this;
  }
  
  withBlocks(...blocks: Block[]): this {
    this.data.blocks = blocks;
    return this;
  }
  
  withBlockGrid(rows: number, cols: number): this {
    const blocks: Block[] = [];
    const startX = 50;
    const startY = 50;
    const blockWidth = 60;
    const blockHeight = 20;
    const spacing = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        blocks.push(createMockBlock({
          id: `block-${row}-${col}`,
          position: {
            x: startX + col * (blockWidth + spacing),
            y: startY + row * (blockHeight + spacing)
          },
          health: Math.min(3, row + 1)
        }));
      }
    }
    
    this.data.blocks = blocks;
    return this;
  }
  
  withPowerUps(...powerUps: string[]): this {
    this.data.powerUps = powerUps;
    return this;
  }
  
  withTimeLimit(seconds: number): this {
    this.data.timeLimit = seconds;
    return this;
  }
  
  build(): Level {
    return { ...this.data } as Level;
  }
}

/**
 * Builder for Ball test data
 */
export class BallBuilder extends TestDataBuilder<Ball> {
  constructor() {
    super();
    this.data = {
      id: 'ball-test',
      type: 'ball',
      position: { x: 400, y: 300 },
      velocity: { x: 2, y: -2 },
      radius: 8,
      speed: 5,
      active: true,
      color: '#FFFFFF',
      trail: [],
      maxSpeed: 15,
      minSpeed: 2
    };
  }
  
  at(x: number, y: number): this {
    this.data.position = { x, y };
    return this;
  }
  
  withVelocity(x: number, y: number): this {
    this.data.velocity = { x, y };
    return this;
  }
  
  withSpeed(speed: number): this {
    this.data.speed = speed;
    return this;
  }
  
  withRadius(radius: number): this {
    this.data.radius = radius;
    return this;
  }
  
  active(): this {
    this.data.active = true;
    return this;
  }
  
  inactive(): this {
    this.data.active = false;
    return this;
  }
  
  build(): Ball {
    return { ...this.data } as Ball;
  }
}

/**
 * Builder for Paddle test data
 */
export class PaddleBuilder extends TestDataBuilder<Paddle> {
  constructor() {
    super();
    this.data = {
      id: 'paddle-test',
      type: 'paddle',
      position: { x: 400, y: 550 },
      velocity: { x: 0, y: 0 },
      width: 100,
      height: 20,
      speed: 8,
      color: '#00FF00',
      active: true
    };
  }
  
  at(x: number, y: number): this {
    this.data.position = { x, y };
    return this;
  }
  
  withWidth(width: number): this {
    this.data.width = width;
    return this;
  }
  
  withSpeed(speed: number): this {
    this.data.speed = speed;
    return this;
  }
  
  moving(velocityX: number): this {
    this.data.velocity = { x: velocityX, y: 0 };
    return this;
  }
  
  build(): Paddle {
    return { ...this.data } as Paddle;
  }
}

/**
 * Builder for Block test data
 */
export class BlockBuilder extends TestDataBuilder<Block> {
  constructor() {
    super();
    this.data = {
      id: 'block-test',
      type: 'block',
      position: { x: 50, y: 50 },
      width: 60,
      height: 20,
      health: 1,
      maxHealth: 1,
      points: 10,
      color: '#FF0000',
      active: true,
      destructible: true
    };
  }
  
  at(x: number, y: number): this {
    this.data.position = { x, y };
    return this;
  }
  
  withHealth(health: number, maxHealth?: number): this {
    this.data.health = health;
    this.data.maxHealth = maxHealth ?? health;
    return this;
  }
  
  withPoints(points: number): this {
    this.data.points = points;
    return this;
  }
  
  withSize(width: number, height: number): this {
    this.data.width = width;
    this.data.height = height;
    return this;
  }
  
  indestructible(): this {
    this.data.destructible = false;
    this.data.health = Infinity;
    this.data.maxHealth = Infinity;
    return this;
  }
  
  destroyed(): this {
    this.data.health = 0;
    this.data.active = false;
    return this;
  }
  
  build(): Block {
    return { ...this.data } as Block;
  }
}

/**
 * Builder for GameConfig test data
 */
export class GameConfigBuilder extends TestDataBuilder<GameConfig> {
  constructor() {
    super();
    this.data = {
      canvasWidth: 800,
      canvasHeight: 600,
      maxLives: 3,
      ballSpeed: 5,
      paddleSpeed: 8,
      powerUpChance: 0.1,
      particlesEnabled: true,
      soundEnabled: true,
      theme: 'classic',
      difficulty: 'normal'
    };
  }
  
  withDimensions(width: number, height: number): this {
    this.data.canvasWidth = width;
    this.data.canvasHeight = height;
    return this;
  }
  
  withDifficulty(difficulty: 'easy' | 'normal' | 'hard'): this {
    this.data.difficulty = difficulty;
    
    // Adjust settings based on difficulty
    switch (difficulty) {
      case 'easy':
        this.data.ballSpeed = 3;
        this.data.paddleSpeed = 10;
        this.data.maxLives = 5;
        break;
      case 'hard':
        this.data.ballSpeed = 8;
        this.data.paddleSpeed = 6;
        this.data.maxLives = 2;
        break;
    }
    
    return this;
  }
  
  withTheme(theme: string): this {
    this.data.theme = theme;
    return this;
  }
  
  noParticles(): this {
    this.data.particlesEnabled = false;
    return this;
  }
  
  noSound(): this {
    this.data.soundEnabled = false;
    return this;
  }
  
  build(): GameConfig {
    return { ...this.data } as GameConfig;
  }
}

// Export convenience factory functions
export const aGameState = () => new GameStateBuilder();
export const aLevel = () => new LevelBuilder();
export const aBall = () => new BallBuilder();
export const aPaddle = () => new PaddleBuilder();
export const aBlock = () => new BlockBuilder();
export const aGameConfig = () => new GameConfigBuilder();