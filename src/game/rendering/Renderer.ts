export interface RenderableEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  alpha?: number;
  visible?: boolean;
  zIndex?: number;
}

export interface SpriteEntity extends RenderableEntity {
  type: "sprite";
  imageSrc: string;
  imageElement?: HTMLImageElement;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
}

export interface RectEntity extends RenderableEntity {
  type: "rect";
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CircleEntity extends RenderableEntity {
  type: "circle";
  radius: number;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface TextEntity extends RenderableEntity {
  type: "text";
  text: string;
  font?: string;
  fontSize?: number;
  fontFamily?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
}

export type Entity = SpriteEntity | RectEntity | CircleEntity | TextEntity;

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface RenderOptions {
  clearCanvas?: boolean;
  backgroundColor?: string;
  enableCulling?: boolean;
  cullMargin?: number;
}

/**
 * Core rendering system for Canvas-based games
 * Provides efficient entity rendering with transformation and culling support
 */
export class Renderer {
  private context: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private camera: Camera;
  private entities: Entity[] = [];
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private renderOptions: RenderOptions;

  constructor(
    context: CanvasRenderingContext2D,
    camera: Camera = { x: 0, y: 0, zoom: 1, rotation: 0 },
    options: RenderOptions = {},
  ) {
    this.context = context;
    this.canvas = context.canvas;
    this.camera = camera;
    this.renderOptions = {
      clearCanvas: true,
      backgroundColor: "transparent",
      enableCulling: true,
      cullMargin: 100,
      ...options,
    };
  }

  /**
   * Add entity to the render queue
   */
  addEntity(entity: Entity): void {
    this.entities.push(entity);

    // Pre-load images for sprite entities
    if (entity.type === "sprite" && !entity.imageElement) {
      this.loadImage(entity.imageSrc);
    }
  }

  /**
   * Remove entity from render queue
   */
  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }

  /**
   * Clear all entities
   */
  clearEntities(): void {
    this.entities = [];
  }

  /**
   * Update camera position and properties
   */
  updateCamera(camera: Partial<Camera>): void {
    Object.assign(this.camera, camera);
  }

  /**
   * Load and cache image
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(src)) {
      return Promise.resolve(this.imageCache.get(src)!);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /**
   * Check if entity is visible within camera bounds (frustum culling)
   */
  private isEntityVisible(entity: Entity): boolean {
    if (!this.renderOptions.enableCulling || entity.visible === false) {
      return entity.visible !== false;
    }

    const margin = this.renderOptions.cullMargin || 0;
    const cameraLeft = this.camera.x - margin;
    const cameraRight =
      this.camera.x + this.canvas.width / this.camera.zoom + margin;
    const cameraTop = this.camera.y - margin;
    const cameraBottom =
      this.camera.y + this.canvas.height / this.camera.zoom + margin;

    const entityRight = entity.x + entity.width;
    const entityBottom = entity.y + entity.height;

    return !(
      entity.x > cameraRight ||
      entityRight < cameraLeft ||
      entity.y > cameraBottom ||
      entityBottom < cameraTop
    );
  }

  /**
   * Apply camera transformation to context
   */
  private applyCameraTransform(): void {
    const ctx = this.context;

    // Reset transform
    ctx.resetTransform();

    // Apply camera zoom and position
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    // Apply camera rotation if needed
    if (this.camera.rotation !== 0) {
      const centerX = this.camera.x + this.canvas.width / 2 / this.camera.zoom;
      const centerY = this.camera.y + this.canvas.height / 2 / this.camera.zoom;
      ctx.translate(centerX, centerY);
      ctx.rotate(this.camera.rotation);
      ctx.translate(-centerX, -centerY);
    }
  }

  /**
   * Apply entity transformation
   */
  private applyEntityTransform(entity: Entity): void {
    const ctx = this.context;

    ctx.translate(entity.x, entity.y);

    if (entity.rotation) {
      ctx.rotate(entity.rotation);
    }

    if (entity.scaleX !== undefined || entity.scaleY !== undefined) {
      const scaleX = entity.scaleX ?? 1;
      const scaleY = entity.scaleY ?? 1;
      ctx.scale(scaleX, scaleY);
    }

    if (entity.alpha !== undefined) {
      ctx.globalAlpha = entity.alpha;
    }
  }

  /**
   * Render sprite entity
   */
  private renderSprite(entity: SpriteEntity): void {
    let image = entity.imageElement;

    if (!image) {
      image = this.imageCache.get(entity.imageSrc);
      if (!image) return; // Image not loaded yet
    }

    const ctx = this.context;

    if (entity.sourceX !== undefined) {
      // Render sprite with source rectangle (sprite sheet)
      ctx.drawImage(
        image,
        entity.sourceX,
        entity.sourceY || 0,
        entity.sourceWidth || entity.width,
        entity.sourceHeight || entity.height,
        0,
        0,
        entity.width,
        entity.height,
      );
    } else {
      // Render full image
      ctx.drawImage(image, 0, 0, entity.width, entity.height);
    }
  }

  /**
   * Render rectangle entity
   */
  private renderRect(entity: RectEntity): void {
    const ctx = this.context;

    if (entity.fillColor) {
      ctx.fillStyle = entity.fillColor;
      ctx.fillRect(0, 0, entity.width, entity.height);
    }

    if (entity.strokeColor && entity.strokeWidth) {
      ctx.strokeStyle = entity.strokeColor;
      ctx.lineWidth = entity.strokeWidth;
      ctx.strokeRect(0, 0, entity.width, entity.height);
    }
  }

  /**
   * Render circle entity
   */
  private renderCircle(entity: CircleEntity): void {
    const ctx = this.context;

    ctx.beginPath();
    ctx.arc(entity.width / 2, entity.height / 2, entity.radius, 0, Math.PI * 2);

    if (entity.fillColor) {
      ctx.fillStyle = entity.fillColor;
      ctx.fill();
    }

    if (entity.strokeColor && entity.strokeWidth) {
      ctx.strokeStyle = entity.strokeColor;
      ctx.lineWidth = entity.strokeWidth;
      ctx.stroke();
    }
  }

  /**
   * Render text entity
   */
  private renderText(entity: TextEntity): void {
    const ctx = this.context;

    // Set font properties
    const fontSize = entity.fontSize || 16;
    const fontFamily = entity.fontFamily || "Arial";
    ctx.font = entity.font || `${fontSize}px ${fontFamily}`;

    if (entity.textAlign) ctx.textAlign = entity.textAlign;
    if (entity.textBaseline) ctx.textBaseline = entity.textBaseline;

    if (entity.fillColor) {
      ctx.fillStyle = entity.fillColor;
      ctx.fillText(entity.text, 0, 0);
    }

    if (entity.strokeColor && entity.strokeWidth) {
      ctx.strokeStyle = entity.strokeColor;
      ctx.lineWidth = entity.strokeWidth;
      ctx.strokeText(entity.text, 0, 0);
    }
  }

  /**
   * Render single entity
   */
  private renderEntity(entity: Entity): void {
    const ctx = this.context;

    ctx.save();

    try {
      this.applyEntityTransform(entity);

      switch (entity.type) {
        case "sprite":
          this.renderSprite(entity);
          break;
        case "rect":
          this.renderRect(entity);
          break;
        case "circle":
          this.renderCircle(entity);
          break;
        case "text":
          this.renderText(entity);
          break;
      }
    } catch (error) {
      console.error("Error rendering entity:", error, entity);
    }

    ctx.restore();
  }

  /**
   * Main render method
   */
  render(): void {
    const ctx = this.context;

    // Clear canvas if requested
    if (this.renderOptions.clearCanvas) {
      ctx.resetTransform();

      if (
        this.renderOptions.backgroundColor &&
        this.renderOptions.backgroundColor !== "transparent"
      ) {
        ctx.fillStyle = this.renderOptions.backgroundColor;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      } else {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }

    // Apply camera transformation
    this.applyCameraTransform();

    // Sort entities by zIndex
    const sortedEntities = [...this.entities].sort((a, b) => {
      const aZ = a.zIndex || 0;
      const bZ = b.zIndex || 0;
      return aZ - bZ;
    });

    // Render visible entities
    for (const entity of sortedEntities) {
      if (this.isEntityVisible(entity)) {
        this.renderEntity(entity);
      }
    }
  }

  /**
   * Get render statistics
   */
  getStats() {
    const visibleEntities = this.entities.filter((entity) =>
      this.isEntityVisible(entity),
    );

    return {
      totalEntities: this.entities.length,
      visibleEntities: visibleEntities.length,
      culledEntities: this.entities.length - visibleEntities.length,
      imagesInCache: this.imageCache.size,
      camera: { ...this.camera },
    };
  }

  /**
   * Apply theme colors to renderer
   */
  applyTheme(theme: any): void {
    this.context.fillStyle = theme.colors.background;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.clearEntities();
    this.imageCache.clear();
  }
}
