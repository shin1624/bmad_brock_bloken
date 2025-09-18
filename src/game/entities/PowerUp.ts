/**
 * PowerUp Entity Implementation for Power-Up Foundation
 * Story 4.1, Task 1: PowerUp Entity extending Entity base class
 */
import { Entity } from './Entity';
import { Vector2D } from '../../types/game.types';

// Power-Up types enumeration (imported from HUD component for consistency)
export enum PowerUpType {
  MultiBall = 'multiball',
  PaddleSize = 'paddlesize', 
  BallSpeed = 'ballspeed',
  Penetration = 'penetration',
  Magnet = 'magnet'
}

// PowerUp metadata interface
export interface PowerUpMetadata {
  type: PowerUpType;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic';
  duration: number; // milliseconds
  effect: PowerUpEffect;
}

// PowerUp effect interface for plugin system
export interface PowerUpEffect {
  id: string;
  priority: number; // Higher priority takes precedence in conflicts
  stackable: boolean;
  conflictsWith?: PowerUpType[];
  apply: (gameState: any) => void;
  remove: (gameState: any) => void;
}

// PowerUp configuration interface
export interface PowerUpConfig {
  size: { width: number; height: number };
  speed: number;
  spawnChance: number; // Probability 0-1
  despawnTime: number; // Time before auto-despawn (ms)
  animationSpeed: number;
}

/**
 * PowerUp Entity Class
 * Implements collectible power-up items that provide temporary game effects
 */
export class PowerUp extends Entity {
  public type: PowerUpType;
  public metadata: PowerUpMetadata;
  public config: PowerUpConfig;
  public timeAlive: number;
  public collected: boolean;
  public animationPhase: number;

  // Default configuration
  private static readonly DEFAULT_CONFIG: PowerUpConfig = {
    size: { width: 24, height: 24 },
    speed: 50, // pixels per second downward
    spawnChance: 0.1,
    despawnTime: 10000, // 10 seconds
    animationSpeed: 2 // cycles per second
  };

  constructor(type: PowerUpType, metadata: PowerUpMetadata, position?: Vector2D, config?: Partial<PowerUpConfig>) {
    super();
    
    this.type = type;
    this.metadata = metadata;
    this.config = { ...PowerUp.DEFAULT_CONFIG, ...config };
    this.timeAlive = 0;
    this.collected = false;
    this.animationPhase = 0;

    // Set initial position
    if (position) {
      this.position = { ...position };
    }

    // Set downward velocity
    this.velocity = { x: 0, y: this.config.speed };
  }

  /**
   * Update PowerUp state - handles movement, animation, and auto-despawn
   */
  public update(deltaTime: number): void {
    if (!this.active || this.collected) {
      return;
    }

    // Update time alive
    this.timeAlive += deltaTime;

    // Auto-despawn after configured time
    if (this.timeAlive >= this.config.despawnTime) {
      this.destroy();
      return;
    }

    // Update position based on velocity
    this.position.x += this.velocity.x * (deltaTime / 1000);
    this.position.y += this.velocity.y * (deltaTime / 1000);

    // Update animation phase for floating/pulsing effect
    this.animationPhase += this.config.animationSpeed * (deltaTime / 1000);
    if (this.animationPhase >= Math.PI * 2) {
      this.animationPhase -= Math.PI * 2;
    }
  }

  /**
   * Render PowerUp with animation effects
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.collected) {
      return;
    }

    ctx.save();

    // Calculate animated offset for floating effect
    const floatOffset = Math.sin(this.animationPhase) * 2;
    const scaleOffset = 1 + Math.sin(this.animationPhase * 2) * 0.1;

    // Position and scale
    const centerX = this.position.x + this.config.size.width / 2;
    const centerY = this.position.y + this.config.size.height / 2 + floatOffset;

    ctx.translate(centerX, centerY);
    ctx.scale(scaleOffset, scaleOffset);

    // Draw outer glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.config.size.width);
    gradient.addColorStop(0, this.metadata.color + '80'); // 50% opacity
    gradient.addColorStop(0.7, this.metadata.color + '40'); // 25% opacity
    gradient.addColorStop(1, this.metadata.color + '00'); // Transparent

    ctx.fillStyle = gradient;
    ctx.fillRect(-this.config.size.width, -this.config.size.height, 
                 this.config.size.width * 2, this.config.size.height * 2);

    // Draw main power-up shape
    ctx.fillStyle = this.metadata.color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // Draw rounded rectangle
    const radius = 4;
    const halfWidth = this.config.size.width / 2;
    const halfHeight = this.config.size.height / 2;

    ctx.beginPath();
    ctx.roundRect(-halfWidth, -halfHeight, this.config.size.width, this.config.size.height, radius);
    ctx.fill();
    ctx.stroke();

    // Draw icon (text-based for now, can be replaced with sprites)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.metadata.icon, 0, 0);

    ctx.restore();
  }

  /**
   * Get collision bounds for detection
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.config.size.width,
      height: this.config.size.height
    };
  }

  /**
   * Mark power-up as collected
   */
  public collect(): void {
    this.collected = true;
    this.active = false;
  }

  /**
   * Check if power-up should despawn (fallen off screen or timed out)
   */
  public shouldDespawn(screenHeight: number): boolean {
    return this.position.y > screenHeight || this.timeAlive >= this.config.despawnTime;
  }

  /**
   * Get remaining time before auto-despawn
   */
  public getRemainingTime(): number {
    return Math.max(0, this.config.despawnTime - this.timeAlive);
  }

  /**
   * Get animation progress (0-1)
   */
  public getAnimationProgress(): number {
    return this.animationPhase / (Math.PI * 2);
  }

  /**
   * Factory method to create PowerUp with predefined metadata
   */
  public static create(type: PowerUpType, position?: Vector2D, config?: Partial<PowerUpConfig>): PowerUp {
    const metadata = PowerUp.getMetadata(type);
    return new PowerUp(type, metadata, position, config);
  }

  /**
   * Get predefined metadata for power-up type
   */
  public static getMetadata(type: PowerUpType): PowerUpMetadata {
    const metadataMap: Record<PowerUpType, PowerUpMetadata> = {
      [PowerUpType.MultiBall]: {
        type: PowerUpType.MultiBall,
        name: 'Multi Ball',
        description: 'Spawns additional balls',
        icon: '⚡',
        color: '#ff6b6b',
        rarity: 'rare',
        duration: 30000, // 30 seconds
        effect: {
          id: 'multiball_effect',
          priority: 10,
          stackable: true,
          apply: () => { /* Implementation in PowerUpSystem */ },
          remove: () => { /* Implementation in PowerUpSystem */ }
        }
      },
      [PowerUpType.PaddleSize]: {
        type: PowerUpType.PaddleSize,
        name: 'Paddle Size',
        description: 'Increases paddle size',
        icon: '🏓',
        color: '#4ecdc4',
        rarity: 'common',
        duration: 20000, // 20 seconds
        effect: {
          id: 'paddle_size_effect',
          priority: 5,
          stackable: false,
          apply: () => { /* Implementation in PowerUpSystem */ },
          remove: () => { /* Implementation in PowerUpSystem */ }
        }
      },
      [PowerUpType.BallSpeed]: {
        type: PowerUpType.BallSpeed,
        name: 'Ball Speed',
        description: 'Modifies ball speed',
        icon: '💨',
        color: '#45b7d1',
        rarity: 'common',
        duration: 15000, // 15 seconds
        effect: {
          id: 'ball_speed_effect',
          priority: 3,
          stackable: false,
          conflictsWith: [PowerUpType.Magnet],
          apply: () => { /* Implementation in PowerUpSystem */ },
          remove: () => { /* Implementation in PowerUpSystem */ }
        }
      },
      [PowerUpType.Penetration]: {
        type: PowerUpType.Penetration,
        name: 'Penetration',
        description: 'Ball penetrates through blocks',
        icon: '🎯',
        color: '#96ceb4',
        rarity: 'epic',
        duration: 10000, // 10 seconds
        effect: {
          id: 'penetration_effect',
          priority: 8,
          stackable: false,
          apply: () => { /* Implementation in PowerUpSystem */ },
          remove: () => { /* Implementation in PowerUpSystem */ }
        }
      },
      [PowerUpType.Magnet]: {
        type: PowerUpType.Magnet,
        name: 'Magnet',
        description: 'Ball sticks to paddle',
        icon: '🧲',
        color: '#feca57',
        rarity: 'rare',
        duration: 25000, // 25 seconds
        effect: {
          id: 'magnet_effect',
          priority: 7,
          stackable: false,
          conflictsWith: [PowerUpType.BallSpeed],
          apply: () => { /* Implementation in PowerUpSystem */ },
          remove: () => { /* Implementation in PowerUpSystem */ }
        }
      }
    };

    return metadataMap[type];
  }
}