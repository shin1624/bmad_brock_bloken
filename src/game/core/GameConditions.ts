import { GameState } from './GameState';
import { GameEvents } from './GameEvents';

type GameMode = 'classic' | 'timeTrial' | 'survival' | 'challenge' | 'hardcore' | 'zen' | 'arcade' | 'puzzle';
type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export class GameConditions {
  private mode: GameMode = 'classic';
  private difficulty: Difficulty = 'normal';
  private targetScore = 0;
  private targetTime = 0;
  private timeLimit = 0;
  private minCombo = 0;
  private gameEnded = false;
  private stuckTime = 0;

  constructor(
    private gameState: GameState,
    private eventBus: GameEvents
  ) {}

  checkWinCondition(): boolean {
    // All destroyable blocks destroyed
    const blocks = this.gameState.getBlocks?.() || [];
    const destroyableBlocks = blocks.filter((b: any) => b.type !== 'unbreakable');
    const allDestroyed = destroyableBlocks.every((b: any) => b.destroyed);
    
    if (allDestroyed && blocks.length > 0) {
      return true;
    }

    // Mode-specific win conditions
    if (this.mode === 'timeTrial' && this.gameState.getScore() >= this.targetScore) {
      return true;
    }
    
    if (this.mode === 'survival' && this.gameState.getElapsedTime?.() >= this.targetTime) {
      return true;
    }

    return false;
  }

  checkLoseCondition(): boolean {
    // No lives remaining
    if (this.gameState.getLives() <= 0) {
      return true;
    }

    // Time limit exceeded
    if (this.timeLimit > 0 && this.gameState.getElapsedTime?.() > this.timeLimit) {
      return true;
    }

    // Mode-specific lose conditions
    if (this.mode === 'challenge' && this.minCombo > 0) {
      if (this.gameState.getCombo?.() < this.minCombo) {
        return true;
      }
    }

    if (this.mode === 'hardcore' && this.gameState.getMissedBalls?.() > 0) {
      return true;
    }

    return false;
  }

  checkDrawCondition(): boolean {
    // Ball stuck for too long
    if (this.stuckTime > 10) {
      return true;
    }

    // Only unbreakable blocks remain with no power-ups
    const blocks = this.gameState.getBlocks?.() || [];
    const hasDestroyableBlocks = blocks.some((b: any) => b.type !== 'unbreakable' && !b.destroyed);
    const hasPowerUps = (this.gameState.getPowerUps?.() || []).length > 0;
    
    if (!hasDestroyableBlocks && !hasPowerUps && blocks.length > 0) {
      return true;
    }

    return false;
  }

  evaluate(): string {
    if (this.gameEnded) {
      return 'ended';
    }

    if (this.checkWinCondition()) {
      this.gameEnded = true;
      this.eventBus.emit('game:win', {
        type: 'game:win',
        score: this.gameState.getScore(),
        time: this.gameState.getElapsedTime?.() || 0,
        level: this.gameState.getLevel()
      });
      return 'win';
    }

    if (this.checkLoseCondition()) {
      this.gameEnded = true;
      const reason = this.gameState.getLives() <= 0 ? 'noLives' : 'other';
      this.eventBus.emit('game:lose', {
        type: 'game:lose',
        reason,
        score: this.gameState.getScore(),
        level: this.gameState.getLevel()
      });
      return 'lose';
    }

    if (this.checkDrawCondition()) {
      this.gameEnded = true;
      return 'draw';
    }

    return 'playing';
  }

  setMode(mode: GameMode): void {
    this.mode = mode;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
  }

  setTargetScore(score: number): void {
    this.targetScore = score;
  }

  setTargetTime(time: number): void {
    this.targetTime = time;
  }

  setTimeLimit(limit: number): void {
    this.timeLimit = limit;
  }

  setMinCombo(combo: number): void {
    this.minCombo = combo;
  }

  onBallMissed(): void {
    if (this.mode === 'hardcore' || (this.mode === 'challenge' && this.minCombo > 0)) {
      // Trigger immediate evaluation
      this.evaluate();
    }
  }

  onBallPositionUnchanged(seconds: number): void {
    this.stuckTime = seconds;
  }

  getLifeBonus(): number {
    switch (this.difficulty) {
      case 'easy': return 2;
      case 'hard': return -1;
      case 'expert': return -2;
      default: return 0;
    }
  }

  getTimeLimit(): number {
    if (this.difficulty === 'expert') {
      return 45;
    }
    return this.timeLimit || 60;
  }

  hasLoseCondition(): boolean {
    return this.mode !== 'zen';
  }

  getScoreMultiplier(): number {
    if (this.mode === 'arcade') return 1.5;
    return 1;
  }

  hasMoveLimit(): boolean {
    return this.mode === 'puzzle';
  }

  getDifficulty(): string {
    return this.difficulty;
  }
}

export class GameInitializer {
  private config: any = {
    difficulty: 'normal',
    lives: 3,
    level: 1,
    soundEnabled: true,
    musicEnabled: true
  };
  private assetPath = '/assets';
  private initialized = false;

  constructor(
    private gameState: GameState,
    private eventBus: GameEvents
  ) {}

  initialize(customConfig?: any): void {
    this.config = { ...this.config, ...customConfig };
    
    this.gameState.setLives(this.config.lives);
    this.gameState.setScore(0);
    this.gameState.setLevel(this.config.level);
    this.gameState.setStatus('ready');
    
    this.initialized = true;
    
    this.eventBus.emit('game:initialized', {
      type: 'game:initialized',
      config: this.config,
      timestamp: Date.now()
    });
  }

  async loadLevel(level: number): Promise<void> {
    const levelData = {
      blocks: this.generateBlocks(level),
      powerUps: [],
      background: 'space'
    };
    
    this.gameState.setLevelData?.(levelData);
  }

  private generateBlocks(level: number): any[] {
    const blocks = [];
    const rows = 3 + Math.floor(level / 3);
    const cols = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        blocks.push({
          type: 'normal',
          x: col * 70 + 50,
          y: row * 30 + 50
        });
      }
    }
    
    return blocks;
  }

  initializeEntities(): void {
    this.gameState.setBall?.({ x: 400, y: 300, radius: 5 });
    this.gameState.setPaddle?.({ x: 350, y: 550, width: 100, height: 15 });
    this.gameState.setBlocks?.(this.generateBlocks(this.config.level));
  }

  setupEventListeners(): void {
    this.eventBus.on('input:move', () => {});
    this.eventBus.on('input:action', () => {});
    this.eventBus.on('game:pause', () => {});
    this.eventBus.on('game:resume', () => {});
  }

  async preloadAssets(): Promise<any> {
    try {
      // Simulate asset loading
      return {
        sprites: {},
        sounds: {},
        fonts: {},
        loaded: true,
        errors: []
      };
    } catch (error) {
      return {
        loaded: false,
        errors: [error]
      };
    }
  }

  cleanup(save?: boolean): void {
    if (save && this.onSave) {
      this.onSave({
        score: this.gameState.getScore(),
        level: this.gameState.getLevel(),
        lives: this.gameState.getLives()
      });
    }
    
    this.eventBus.removeAllListeners();
    this.gameState.setStatus('destroyed');
    
    if (this.onCancel) {
      this.onCancel();
    }
  }

  reset(): void {
    this.gameState.setScore(0);
    this.gameState.setLives(3);
    this.gameState.setLevel(1);
  }

  restart(): void {
    const currentLevel = this.gameState.getLevel();
    this.reset();
    this.gameState.setLevel(currentLevel);
  }

  validateState(): boolean {
    return this.gameState.getLives() >= 0;
  }

  validateAndFix(): void {
    if (this.gameState.getLives() < 0) {
      this.gameState.setLives(0);
    }
  }

  checkInitialization(): string[] {
    const errors = [];
    if (!this.initialized) {
      errors.push('notInitialized');
    }
    return errors;
  }

  getDifficulty(): string {
    return this.config.difficulty;
  }

  isSoundEnabled(): boolean {
    return this.config.soundEnabled;
  }

  setAssetPath(path: string): void {
    this.assetPath = path;
  }

  onSave?: (data: any) => void;
  onCancel?: () => void;
}