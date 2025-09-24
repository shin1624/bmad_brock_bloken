import { GameEvents } from './GameEvents';

export interface Level {
  number: number;
  blocks: any[];
  ballSpeed: number;
  paddleWidth: number;
}

export interface LevelState {
  blocksRemaining: number;
  blocksDestroyed: number;
  powerUpsCollected: number;
  startTime: number;
}

export class LevelProgression {
  private currentLevel = 1;
  private totalLevels = 20;
  private levelState: LevelState;
  private unlockedLevels: number[] = [1];
  private levelScores: Map<number, number> = new Map();
  private levelStars: Map<number, number> = new Map();
  private isComplete = false;

  constructor(private eventBus: GameEvents) {
    this.levelState = this.createInitialState();
  }

  private createInitialState(): LevelState {
    return {
      blocksRemaining: 30,
      blocksDestroyed: 0,
      powerUpsCollected: 0,
      startTime: Date.now()
    };
  }

  getCurrentLevel(): number {
    return this.currentLevel;
  }

  getTotalLevels(): number {
    return this.totalLevels;
  }

  getCurrentLevelConfig(): Level {
    return {
      number: this.currentLevel,
      blocks: this.generateBlocks(),
      ballSpeed: 200 + (this.currentLevel * 10),
      paddleWidth: Math.max(60, 100 - (this.currentLevel * 2))
    };
  }

  private generateBlocks(): any[] {
    const blocks = [];
    const rows = 3 + Math.floor(this.currentLevel / 3);
    const cols = 10;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const type = this.currentLevel > 5 && Math.random() < 0.2 ? 'hard' : 'normal';
        blocks.push({
          type,
          x: col * 70 + 50,
          y: row * 30 + 50,
          destroyed: false
        });
      }
    }
    
    // Add special blocks at higher levels
    if (this.currentLevel >= 5) {
      const specialCount = Math.floor(this.currentLevel / 5);
      for (let i = 0; i < specialCount && i < blocks.length; i++) {
        const index = Math.floor(Math.random() * blocks.length);
        blocks[index].type = ['explosive', 'powerup', 'metal'][i % 3];
      }
    }
    
    return blocks;
  }

  getLevelState(): LevelState {
    return { ...this.levelState };
  }

  onBlockDestroyed(): void {
    this.levelState.blocksDestroyed++;
    this.levelState.blocksRemaining--;
    
    const percentage = this.getCompletionPercentage();
    
    this.eventBus.emit('level:progress', {
      type: 'level:progress',
      percentage,
      blocksRemaining: this.levelState.blocksRemaining,
      blocksDestroyed: this.levelState.blocksDestroyed
    });
    
    if (this.isLevelComplete()) {
      this.completeLevel();
    }
  }

  onPowerUpCollected(): void {
    this.levelState.powerUpsCollected++;
  }

  isLevelComplete(): boolean {
    return this.levelState.blocksRemaining <= 0;
  }

  getCompletionPercentage(): number {
    const total = this.levelState.blocksDestroyed + this.levelState.blocksRemaining;
    if (total === 0) return 0;
    return (this.levelState.blocksDestroyed / total) * 100;
  }

  startLevel(): void {
    this.levelState = this.createInitialState();
    
    this.eventBus.emit('level:start', {
      type: 'level:start',
      level: this.currentLevel,
      config: this.getCurrentLevelConfig()
    });
  }

  completeLevel(): number {
    const timeSeconds = (Date.now() - this.levelState.startTime) / 1000;
    const stars = this.calculateStars({
      timeSeconds,
      accuracy: 100,
      combosUsed: true
    });
    
    this.levelStars.set(this.currentLevel, stars);
    
    this.eventBus.emit('level:complete', {
      type: 'level:complete',
      level: this.currentLevel,
      score: 1000,
      stars,
      time: timeSeconds
    });
    
    // Unlock next level
    if (this.currentLevel < this.totalLevels && !this.unlockedLevels.includes(this.currentLevel + 1)) {
      this.unlockedLevels.push(this.currentLevel + 1);
    }
    
    return timeSeconds;
  }

  calculateStars(data: { timeSeconds: number; accuracy: number; combosUsed: boolean }): number {
    if (data.timeSeconds <= 30 && data.accuracy >= 90 && data.combosUsed) return 3;
    if (data.timeSeconds <= 60 && data.accuracy >= 70) return 2;
    return 1;
  }

  nextLevel(): void {
    if (this.currentLevel < this.totalLevels) {
      this.currentLevel++;
      this.startLevel();
    } else {
      this.isComplete = true;
      this.eventBus.emit('game:complete', {
        type: 'game:complete'
      });
    }
  }

  selectLevel(level: number): void {
    if (this.isLevelUnlocked(level)) {
      this.currentLevel = level;
      this.startLevel();
    }
  }

  isLevelUnlocked(level: number): boolean {
    return this.unlockedLevels.includes(level);
  }

  isGameComplete(): boolean {
    return this.isComplete;
  }

  restartLevel(): void {
    this.startLevel();
  }

  getLevelRequirements(level: number): { minScore?: number; minStars?: number } {
    const requirements: any = {};
    
    if (level > 1) {
      requirements.minScore = (level - 1) * 500;
    }
    
    if (level >= 10) {
      requirements.minStars = 2;
    }
    
    return requirements;
  }

  canProgressToLevel(level: number, data: { score: number; stars: number }): boolean {
    const requirements = this.getLevelRequirements(level);
    
    if (requirements.minScore && data.score < requirements.minScore) {
      return false;
    }
    
    if (requirements.minStars && data.stars < requirements.minStars) {
      return false;
    }
    
    return true;
  }

  getTotalStarsRequired(upToLevel: number): number {
    let total = 0;
    for (let i = 2; i <= upToLevel; i++) {
      const req = this.getLevelRequirements(i);
      total += req.minStars || 0;
    }
    return total;
  }

  getTotalScoreRequired(upToLevel: number): number {
    let total = 0;
    for (let i = 2; i <= upToLevel; i++) {
      const req = this.getLevelRequirements(i);
      total += req.minScore || 0;
    }
    return total;
  }

  getLevelScore(level: number): number {
    return this.levelScores.get(level) || 0;
  }

  getLevelStars(level: number): number {
    return this.levelStars.get(level) || 0;
  }

  save(): any {
    return {
      currentLevel: this.currentLevel,
      unlockedLevels: this.unlockedLevels,
      levelScores: Object.fromEntries(this.levelScores),
      levelStars: Object.fromEntries(this.levelStars),
      levelState: this.levelState
    };
  }

  load(data: any): void {
    this.currentLevel = data.currentLevel;
    this.unlockedLevels = data.unlockedLevels;
    this.levelScores = new Map(Object.entries(data.levelScores || {}));
    this.levelStars = new Map(Object.entries(data.levelStars || {}));
    this.levelState = data.levelState || this.createInitialState();
  }
}