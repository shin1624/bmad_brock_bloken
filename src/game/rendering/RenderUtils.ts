import type {
  Entity,
  SpriteEntity,
  RectEntity,
  CircleEntity,
  TextEntity,
} from "./Renderer";

/**
 * Animation configuration type
 */
export interface AnimationConfig {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  framesPerRow: number;
  currentFrame: number;
}

/**
 * Particle configuration type
 */
export interface ParticleConfig {
  lifetime: number;
  age: number;
  velocityX: number;
  velocityY: number;
}

/**
 * Utility functions for creating and manipulating render entities
 */
export class RenderUtils {
  /**
   * Create a sprite entity
   */
  static createSprite(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageSrc: string;
    sourceRect?: { x: number; y: number; width: number; height: number };
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
  }): SpriteEntity {
    return {
      type: "sprite",
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      imageSrc: config.imageSrc,
      sourceX: config.sourceRect?.x,
      sourceY: config.sourceRect?.y,
      sourceWidth: config.sourceRect?.width,
      sourceHeight: config.sourceRect?.height,
      rotation: config.rotation,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      visible: config.visible,
      zIndex: config.zIndex,
    };
  }

  /**
   * Create a rectangle entity
   */
  static createRect(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
  }): RectEntity {
    return {
      type: "rect",
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      fillColor: config.fillColor,
      strokeColor: config.strokeColor,
      strokeWidth: config.strokeWidth,
      rotation: config.rotation,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      visible: config.visible,
      zIndex: config.zIndex,
    };
  }

  /**
   * Create a circle entity
   */
  static createCircle(config: {
    x: number;
    y: number;
    radius: number;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
  }): CircleEntity {
    return {
      type: "circle",
      x: config.x,
      y: config.y,
      width: config.radius * 2,
      height: config.radius * 2,
      radius: config.radius,
      fillColor: config.fillColor,
      strokeColor: config.strokeColor,
      strokeWidth: config.strokeWidth,
      rotation: config.rotation,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      visible: config.visible,
      zIndex: config.zIndex,
    };
  }

  /**
   * Create a text entity
   */
  static createText(config: {
    x: number;
    y: number;
    text: string;
    font?: string;
    fontSize?: number;
    fontFamily?: string;
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    textAlign?: CanvasTextAlign;
    textBaseline?: CanvasTextBaseline;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
  }): TextEntity {
    // Approximate text dimensions (more accurate measurement would require canvas context)
    const fontSize = config.fontSize || 16;
    const approximateWidth = config.text.length * fontSize * 0.6;
    const approximateHeight = fontSize;

    return {
      type: "text",
      x: config.x,
      y: config.y,
      width: approximateWidth,
      height: approximateHeight,
      text: config.text,
      font: config.font,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fillColor: config.fillColor,
      strokeColor: config.strokeColor,
      strokeWidth: config.strokeWidth,
      textAlign: config.textAlign,
      textBaseline: config.textBaseline,
      rotation: config.rotation,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      visible: config.visible,
      zIndex: config.zIndex,
    };
  }

  /**
   * Create animated sprite entity with frame configuration
   */
  static createAnimatedSprite(config: {
    x: number;
    y: number;
    width: number;
    height: number;
    imageSrc: string;
    frameWidth: number;
    frameHeight: number;
    frameCount: number;
    framesPerRow?: number;
    currentFrame?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    alpha?: number;
    visible?: boolean;
    zIndex?: number;
  }): SpriteEntity & {
    animation: {
      frameWidth: number;
      frameHeight: number;
      frameCount: number;
      framesPerRow: number;
      currentFrame: number;
    };
  } {
    const framesPerRow = config.framesPerRow || config.frameCount;
    const currentFrame = config.currentFrame || 0;
    const frameX = (currentFrame % framesPerRow) * config.frameWidth;
    const frameY = Math.floor(currentFrame / framesPerRow) * config.frameHeight;

    return {
      type: "sprite",
      x: config.x,
      y: config.y,
      width: config.width,
      height: config.height,
      imageSrc: config.imageSrc,
      sourceX: frameX,
      sourceY: frameY,
      sourceWidth: config.frameWidth,
      sourceHeight: config.frameHeight,
      rotation: config.rotation,
      scaleX: config.scaleX,
      scaleY: config.scaleY,
      alpha: config.alpha,
      visible: config.visible,
      zIndex: config.zIndex,
      animation: {
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight,
        frameCount: config.frameCount,
        framesPerRow,
        currentFrame,
      },
    };
  }

  /**
   * Update animated sprite frame
   */
  static updateAnimatedSprite(
    sprite: SpriteEntity & { animation: AnimationConfig },
    frame: number,
  ): void {
    const { frameWidth, frameHeight, frameCount, framesPerRow } =
      sprite.animation;
    const clampedFrame = Math.max(0, Math.min(frame, frameCount - 1));

    sprite.animation.currentFrame = clampedFrame;
    sprite.sourceX = (clampedFrame % framesPerRow) * frameWidth;
    sprite.sourceY = Math.floor(clampedFrame / framesPerRow) * frameHeight;
  }

  /**
   * Check collision between two entities (axis-aligned bounding box)
   */
  static checkCollision(entity1: Entity, entity2: Entity): boolean {
    return (
      entity1.x < entity2.x + entity2.width &&
      entity1.x + entity1.width > entity2.x &&
      entity1.y < entity2.y + entity2.height &&
      entity1.y + entity1.height > entity2.y
    );
  }

  /**
   * Check if point is inside entity bounds
   */
  static isPointInEntity(x: number, y: number, entity: Entity): boolean {
    return (
      x >= entity.x &&
      x <= entity.x + entity.width &&
      y >= entity.y &&
      y <= entity.y + entity.height
    );
  }

  /**
   * Get distance between two entities (center to center)
   */
  static getDistance(entity1: Entity, entity2: Entity): number {
    const dx = entity1.x + entity1.width / 2 - (entity2.x + entity2.width / 2);
    const dy =
      entity1.y + entity1.height / 2 - (entity2.y + entity2.height / 2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Move entity by delta values
   */
  static moveEntity(entity: Entity, deltaX: number, deltaY: number): void {
    entity.x += deltaX;
    entity.y += deltaY;
  }

  /**
   * Set entity position
   */
  static setEntityPosition(entity: Entity, x: number, y: number): void {
    entity.x = x;
    entity.y = y;
  }

  /**
   * Scale entity
   */
  static scaleEntity(entity: Entity, scaleX: number, scaleY?: number): void {
    entity.scaleX = scaleX;
    entity.scaleY = scaleY !== undefined ? scaleY : scaleX;
  }

  /**
   * Rotate entity
   */
  static rotateEntity(entity: Entity, rotation: number): void {
    entity.rotation = rotation;
  }

  /**
   * Set entity alpha
   */
  static setEntityAlpha(entity: Entity, alpha: number): void {
    entity.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Clone entity
   */
  static cloneEntity<T extends Entity>(entity: T): T {
    return JSON.parse(JSON.stringify(entity));
  }

  /**
   * Create a simple particle effect entity
   */
  static createParticle(config: {
    x: number;
    y: number;
    size: number;
    color: string;
    velocityX?: number;
    velocityY?: number;
    life?: number;
    decay?: number;
  }): RectEntity & {
    particle: {
      velocityX: number;
      velocityY: number;
      life: number;
      maxLife: number;
      decay: number;
    };
  } {
    const life = config.life || 1.0;

    return {
      type: "rect",
      x: config.x,
      y: config.y,
      width: config.size,
      height: config.size,
      fillColor: config.color,
      alpha: 1.0,
      particle: {
        velocityX: config.velocityX || 0,
        velocityY: config.velocityY || 0,
        life,
        maxLife: life,
        decay: config.decay || 0.02,
      },
    };
  }

  /**
   * Update particle (returns false if particle should be removed)
   */
  static updateParticle(
    particle: RectEntity & { particle: ParticleConfig },
    deltaTime: number,
  ): boolean {
    particle.x += particle.particle.velocityX * deltaTime;
    particle.y += particle.particle.velocityY * deltaTime;
    particle.particle.life -= particle.particle.decay * deltaTime;

    // Update alpha based on remaining life
    particle.alpha = Math.max(
      0,
      particle.particle.life / particle.particle.maxLife,
    );

    return particle.particle.life > 0;
  }
}
