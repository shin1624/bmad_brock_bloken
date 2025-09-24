import { GameEvents } from './GameEvents';
import { BlockType } from '../entities/Block';

interface ScoreData {
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
}

export class ScoreSystem {
  private score = 0;
  private highScore = 0;
  private combo = 0;
  private maxCombo = 0;
  private multiplier = 1;
  private multiplierExpiry = 0;

  constructor(private eventBus: GameEvents) {}

  getScore(): number {
    return this.score;
  }

  getHighScore(): number {
    return this.highScore;
  }

  getCombo(): number {
    return this.combo;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  addScore(points: number): void {
    const comboMultiplier = 1 + (this.combo / 10);
    const finalPoints = Math.floor(points * comboMultiplier * this.multiplier);
    
    this.score += finalPoints;
    
    if (this.score > this.highScore) {
      const previousHighScore = this.highScore;
      this.highScore = this.score;
      
      this.eventBus.emit('score:highscore', {
        type: 'score:highscore',
        score: this.score,
        previousHighScore
      });
    }
    
    this.eventBus.emit('score:changed', {
      type: 'score:changed',
      score: this.score,
      delta: finalPoints,
      multiplier: comboMultiplier * this.multiplier
    });

    // Check for milestones
    const milestones = [1000, 5000, 10000, 25000, 50000, 100000];
    for (const milestone of milestones) {
      if (this.score >= milestone && this.score - finalPoints < milestone) {
        this.eventBus.emit('score:milestone', {
          type: 'score:milestone',
          score: this.score,
          milestone
        });
        break;
      }
    }
  }

  onBlockDestroyed(type: BlockType): void {
    const scores = {
      [BlockType.NORMAL]: 10,
      [BlockType.HARD]: 20,
      [BlockType.METAL]: 30,
      [BlockType.GOLD]: 50,
      [BlockType.EXPLOSIVE]: 40,
      [BlockType.POWER_UP]: 25,
      [BlockType.UNBREAKABLE]: 0
    };
    
    this.addScore(scores[type] || 10);
  }

  incrementCombo(): void {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    
    const comboMultiplier = 1 + (this.combo / 10);
    
    this.eventBus.emit('combo:changed', {
      type: 'combo:changed',
      combo: this.combo,
      multiplier: comboMultiplier
    });
  }

  resetCombo(): void {
    this.combo = 0;
    
    this.eventBus.emit('combo:changed', {
      type: 'combo:changed',
      combo: 0,
      multiplier: 1
    });
  }

  setMultiplier(value: number, duration?: number): void {
    this.multiplier = Math.min(value, 5); // Cap at 5x
    
    if (duration) {
      this.multiplierExpiry = Date.now() + duration;
    }
  }

  update(deltaTime: number): void {
    if (this.multiplierExpiry > 0 && Date.now() > this.multiplierExpiry) {
      this.multiplier = 1;
      this.multiplierExpiry = 0;
    }
  }

  onPerfectClear(): void {
    this.addScore(1000);
  }

  onSpeedBonus(seconds: number): void {
    const bonus = seconds <= 15 ? 1000 : seconds <= 30 ? 500 : 250;
    this.addScore(bonus);
  }

  onLevelComplete(noMisses: boolean): void {
    if (noMisses) {
      this.addScore(500);
    }
  }

  onChainReaction(blocks: number): void {
    this.addScore(blocks * 50);
  }

  calculateLevelScore(data: {
    blocksDestroyed: number;
    timeBonus: number;
    maxCombo: number;
    perfectClear: boolean;
    noMisses: boolean;
  }): number {
    let total = data.blocksDestroyed * 10 + data.timeBonus;
    
    if (data.maxCombo >= 10) {
      total += 200;
    }
    
    if (data.noMisses) {
      total += 500;
    }
    
    return total;
  }

  save(): ScoreData {
    return {
      score: this.score,
      highScore: this.highScore,
      combo: this.combo,
      maxCombo: this.maxCombo
    };
  }

  load(data: ScoreData): void {
    this.score = data.score;
    this.highScore = data.highScore;
    this.combo = data.combo;
    this.maxCombo = data.maxCombo;
  }

  reset(): void {
    this.score = 0;
    this.combo = 0;
    // High score and max combo persist
  }

  onSave?: (data: ScoreData) => void;
}