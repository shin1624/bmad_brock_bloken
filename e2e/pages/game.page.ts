import { Page } from '@playwright/test';
import { BasePage } from './base.page';
import {
  waitForCanvasReady,
  waitForGameEngineReady,
  getGameState,
  movePaddleTo,
  startNewGame,
  pauseGame,
  resumeGame,
  pressGameKey,
  getFPS,
  screenshotCanvas,
  GameState
} from '../fixtures/canvas-helpers';

/**
 * Game Page Object Model
 * Handles interactions with the main game canvas and gameplay
 */
export class GamePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to game and wait for it to be ready
   */
  async gotoGame() {
    await this.goto('/');
    await this.waitForGameReady();
  }

  /**
   * Wait for game to be fully ready
   */
  async waitForGameReady() {
    await waitForCanvasReady(this.page);
    await waitForGameEngineReady(this.page);
  }

  /**
   * Get current game state
   */
  async getGameState(): Promise<GameState> {
    return await getGameState(this.page);
  }

  /**
   * Start a new game
   */
  async startNewGame() {
    await startNewGame(this.page);
  }

  /**
   * Pause the game
   */
  async pauseGame() {
    await pauseGame(this.page);
  }

  /**
   * Resume the game
   */
  async resumeGame() {
    await resumeGame(this.page);
  }

  /**
   * Move paddle to specific position
   */
  async movePaddle(x: number) {
    await movePaddleTo(this.page, x);
  }

  /**
   * Move paddle left
   */
  async movePaddleLeft() {
    await pressGameKey(this.page, 'ArrowLeft');
  }

  /**
   * Move paddle right
   */
  async movePaddleRight() {
    await pressGameKey(this.page, 'ArrowRight');
  }

  /**
   * Use keyboard controls (WASD)
   */
  async useWASDControls(key: 'w' | 'a' | 's' | 'd') {
    await pressGameKey(this.page, key);
  }

  /**
   * Get current score
   */
  async getScore(): Promise<number> {
    const state = await this.getGameState();
    return state.score;
  }

  /**
   * Get remaining lives
   */
  async getLives(): Promise<number> {
    const state = await this.getGameState();
    return state.lives;
  }

  /**
   * Get current level
   */
  async getLevel(): Promise<number> {
    const state = await this.getGameState();
    return state.level;
  }

  /**
   * Check if game is playing
   */
  async isPlaying(): Promise<boolean> {
    const state = await this.getGameState();
    return state.isPlaying;
  }

  /**
   * Check if game is paused
   */
  async isPaused(): Promise<boolean> {
    const state = await this.getGameState();
    return state.isPaused;
  }

  /**
   * Check if game is over
   */
  async isGameOver(): Promise<boolean> {
    const state = await this.getGameState();
    return state.isGameOver;
  }

  /**
   * Get current FPS
   */
  async getFPS(): Promise<number> {
    return await getFPS(this.page);
  }

  /**
   * Take screenshot of game canvas
   */
  async screenshotGame(path?: string) {
    return await screenshotCanvas(this.page, path);
  }

  /**
   * Wait for specific score
   */
  async waitForScore(targetScore: number, timeout = 30000) {
    await this.page.waitForFunction(
      (score) => {
        if (!window.gameEngine) return false;
        const state = window.gameEngine.getState();
        return state.score >= score;
      },
      targetScore,
      { timeout }
    );
  }

  /**
   * Wait for level change
   */
  async waitForLevel(targetLevel: number, timeout = 30000) {
    await this.page.waitForFunction(
      (level) => {
        if (!window.gameEngine) return false;
        const state = window.gameEngine.getState();
        return state.level >= level;
      },
      targetLevel,
      { timeout }
    );
  }

  /**
   * Wait for game over
   */
  async waitForGameOver(timeout = 30000) {
    await this.page.waitForFunction(
      () => {
        if (!window.gameEngine) return false;
        const state = window.gameEngine.getState();
        return state.isGameOver === true;
      },
      { timeout }
    );
  }

  /**
   * Get HUD elements
   */
  async getHUDElements() {
    return {
      score: await this.getText('.hud-score'),
      lives: await this.getText('.hud-lives'),
      level: await this.getText('.hud-level'),
      combo: await this.getText('.hud-combo'),
      powerUp: await this.getText('.hud-powerup')
    };
  }

  /**
   * Verify game performance
   */
  async checkPerformance() {
    const samples: number[] = [];
    
    // Collect FPS samples over 3 seconds
    for (let i = 0; i < 30; i++) {
      const fps = await this.getFPS();
      samples.push(fps);
      await this.page.waitForTimeout(100);
    }
    
    const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
    const minFPS = Math.min(...samples);
    const maxFPS = Math.max(...samples);
    
    return {
      average: avgFPS,
      min: minFPS,
      max: maxFPS,
      samples
    };
  }
}