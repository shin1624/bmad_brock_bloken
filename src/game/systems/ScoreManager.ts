/**
 * Score Management System
 * Handles score calculation, combo system, and high score tracking
 */
import { EventBus } from '../core/EventBus';
import { BlockType } from '../../types/game.types';

export interface ScoreConfig {
  baseScores: Record<BlockType, number>;
  comboMultiplier: number;
  comboDecayTime: number;
  maxCombo: number;
  levelCompletionBonus: number;
  lifeBonus: number;
}

export interface ScoreState {
  currentScore: number;
  highScore: number;
  combo: number;
  level: number;
  lives: number;
  blocksDestroyed: number;
  totalBlocks: number;
}

export class ScoreManager {
  private eventBus: EventBus;
  private config: ScoreConfig;
  private state: ScoreState;
  private comboTimer: number;
  private sessionStartTime: number;
  private scoreHistory: { timestamp: number; score: number; event: string }[];

  constructor(eventBus: EventBus, config: Partial<ScoreConfig> = {}) {
    this.eventBus = eventBus;
    
    // Default configuration
    this.config = {
      baseScores: {
        [BlockType.Normal]: 100,
        [BlockType.Hard]: 200,
        [BlockType.Indestructible]: 0
      },
      comboMultiplier: 0.1, // 10% bonus per combo level
      comboDecayTime: 2000, // 2 seconds to maintain combo
      maxCombo: 20, // Maximum combo level
      levelCompletionBonus: 1000,
      lifeBonus: 500,
      ...config
    };

    // Initialize state
    this.state = {
      currentScore: 0,
      highScore: this.loadHighScore(),
      combo: 0,
      level: 1,
      lives: 3,
      blocksDestroyed: 0,
      totalBlocks: 0
    };

    this.comboTimer = 0;
    this.sessionStartTime = Date.now();
    this.scoreHistory = [];

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for score-related events
   */
  private setupEventListeners(): void {
    // Block destruction scoring
    this.eventBus.on('block:destroyed', (data: {
      type: BlockType;
      position: { x: number; y: number };
      score?: number;
      combo?: number;
    }) => {
      this.handleBlockDestroyed(data.type, data.combo || 0);
    });

    // Level completion bonus
    this.eventBus.on('level:cleared', (data: {
      level: number;
      remainingLives: number;
    }) => {
      this.handleLevelCleared(data.level, data.remainingLives);
    });

    // Life lost penalty
    this.eventBus.on('ball:lost', (data: {
      remainingLives: number;
    }) => {
      this.handleLifeLost(data.remainingLives);
    });

    // Level start - reset combo
    this.eventBus.on('level:started', (data: {
      level: number;
      totalBlocks: number;
    }) => {
      this.handleLevelStarted(data.level, data.totalBlocks);
    });
  }

  /**
   * Handle block destroyed event
   */
  private handleBlockDestroyed(blockType: BlockType, currentCombo: number): void {
    if (blockType === BlockType.Indestructible) {
      return; // No score for indestructible blocks
    }

    const baseScore = this.config.baseScores[blockType];
    let finalScore = baseScore;

    // Apply combo bonus
    if (currentCombo > 1) {
      const comboBonus = baseScore * this.config.comboMultiplier * (currentCombo - 1);
      finalScore = Math.floor(baseScore + comboBonus);
    }

    // Update state
    this.state.currentScore += finalScore;
    this.state.combo = Math.min(currentCombo, this.config.maxCombo);
    this.state.blocksDestroyed++;
    this.comboTimer = 0; // Reset combo timer

    // Record score event
    this.recordScoreEvent('block_destroyed', finalScore);

    // Check for high score
    if (this.state.currentScore > this.state.highScore) {
      this.state.highScore = this.state.currentScore;
      this.saveHighScore(this.state.highScore);
      this.eventBus.emit('score:newHighScore', {
        newHighScore: this.state.highScore,
        previousHighScore: this.state.highScore - finalScore
      });
    }

    // Emit score update
    this.eventBus.emit('score:updated', {
      score: this.state.currentScore,
      combo: this.state.combo,
      scoreGained: finalScore,
      blockType: blockType
    });

    // Emit combo activation if combo > 1
    if (this.state.combo > 1) {
      this.eventBus.emit('combo:activated', {
        combo: this.state.combo,
        bonusScore: finalScore - baseScore
      });
    }
  }

  /**
   * Handle level cleared event
   */
  private handleLevelCleared(level: number, remainingLives: number): void {
    let bonus = this.config.levelCompletionBonus;
    
    // Life bonus
    if (remainingLives > 0) {
      bonus += remainingLives * this.config.lifeBonus;
    }

    // Perfect level bonus (no lives lost)
    if (remainingLives === this.state.lives) {
      bonus *= 1.5; // 50% bonus for perfect level
    }

    const finalBonus = Math.floor(bonus);
    this.state.currentScore += finalBonus;

    // Record score event
    this.recordScoreEvent('level_cleared', finalBonus);

    this.eventBus.emit('score:levelBonus', {
      level: level,
      bonus: finalBonus,
      remainingLives: remainingLives,
      totalScore: this.state.currentScore
    });

    // Update high score if needed
    if (this.state.currentScore > this.state.highScore) {
      this.state.highScore = this.state.currentScore;
      this.saveHighScore(this.state.highScore);
    }

    // Emit updated score
    this.eventBus.emit('score:updated', {
      score: this.state.currentScore,
      combo: this.state.combo,
      scoreGained: finalBonus,
      blockType: null
    });
  }

  /**
   * Handle life lost event
   */
  private handleLifeLost(remainingLives: number): void {
    this.state.lives = remainingLives;
    this.state.combo = 0; // Reset combo on life lost
    this.comboTimer = 0;

    this.eventBus.emit('combo:reset', {
      reason: 'life_lost'
    });
  }

  /**
   * Handle level started event
   */
  private handleLevelStarted(level: number, totalBlocks: number): void {
    this.state.level = level;
    this.state.totalBlocks = totalBlocks;
    this.state.blocksDestroyed = 0;
    this.state.combo = 0;
    this.comboTimer = 0;

    this.eventBus.emit('score:levelStarted', {
      level: level,
      currentScore: this.state.currentScore
    });
  }

  /**
   * Update score manager (called each frame)
   */
  public update(deltaTime: number): void {
    // Update combo timer
    if (this.state.combo > 0) {
      this.comboTimer += deltaTime;
      
      if (this.comboTimer >= this.config.comboDecayTime) {
        this.state.combo = 0;
        this.comboTimer = 0;
        
        this.eventBus.emit('combo:reset', {
          reason: 'timeout'
        });
      }
    }
  }

  /**
   * Record a score event for analytics
   */
  private recordScoreEvent(eventType: string, score: number): void {
    this.scoreHistory.push({
      timestamp: Date.now(),
      score: score,
      event: eventType
    });

    // Keep only last 100 events to prevent memory bloat
    if (this.scoreHistory.length > 100) {
      this.scoreHistory.splice(0, this.scoreHistory.length - 100);
    }
  }

  /**
   * Get current score state
   */
  public getState(): ScoreState {
    return { ...this.state };
  }

  /**
   * Get current score
   */
  public getCurrentScore(): number {
    return this.state.currentScore;
  }

  /**
   * Get high score
   */
  public getHighScore(): number {
    return this.state.highScore;
  }

  /**
   * Get current combo
   */
  public getCombo(): number {
    return this.state.combo;
  }

  /**
   * Calculate completion percentage
   */
  public getCompletionPercentage(): number {
    if (this.state.totalBlocks === 0) return 0;
    return (this.state.blocksDestroyed / this.state.totalBlocks) * 100;
  }

  /**
   * Get score statistics
   */
  public getStatistics(): {
    sessionDuration: number;
    averageScorePerMinute: number;
    blocksPerMinute: number;
    highestCombo: number;
    totalEvents: number;
  } {
    const sessionDuration = (Date.now() - this.sessionStartTime) / 1000; // seconds
    const sessionMinutes = sessionDuration / 60;
    
    const highestCombo = Math.max(...this.scoreHistory.map(h => 
      h.event === 'block_destroyed' ? this.state.combo : 0
    ), 0);

    return {
      sessionDuration,
      averageScorePerMinute: sessionMinutes > 0 ? this.state.currentScore / sessionMinutes : 0,
      blocksPerMinute: sessionMinutes > 0 ? this.state.blocksDestroyed / sessionMinutes : 0,
      highestCombo,
      totalEvents: this.scoreHistory.length
    };
  }

  /**
   * Reset score for new game
   */
  public resetScore(): void {
    this.state.currentScore = 0;
    this.state.combo = 0;
    this.state.level = 1;
    this.state.lives = 3;
    this.state.blocksDestroyed = 0;
    this.state.totalBlocks = 0;
    this.comboTimer = 0;
    this.sessionStartTime = Date.now();
    this.scoreHistory = [];

    this.eventBus.emit('score:reset', {
      highScore: this.state.highScore
    });
  }

  /**
   * Load high score from localStorage
   */
  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem('blockbreaker_highscore');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Save high score to localStorage
   */
  private saveHighScore(score: number): void {
    try {
      localStorage.setItem('blockbreaker_highscore', score.toString());
    } catch {
      // localStorage not available - ignore
    }
  }

  /**
   * Get score breakdown for display
   */
  public getScoreBreakdown(): {
    baseScore: number;
    comboBonus: number;
    levelBonus: number;
    lifeBonus: number;
    total: number;
  } {
    // This is a simplified breakdown - in a real implementation,
    // you'd track these components separately
    return {
      baseScore: Math.floor(this.state.currentScore * 0.7),
      comboBonus: Math.floor(this.state.currentScore * 0.2),
      levelBonus: Math.floor(this.state.currentScore * 0.08),
      lifeBonus: Math.floor(this.state.currentScore * 0.02),
      total: this.state.currentScore
    };
  }

  /**
   * Update score configuration
   */
  public updateConfig(newConfig: Partial<ScoreConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.eventBus.off('block:destroyed');
    this.eventBus.off('level:cleared');
    this.eventBus.off('ball:lost');
    this.eventBus.off('level:started');
  }
}