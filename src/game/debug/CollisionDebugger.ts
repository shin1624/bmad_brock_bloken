/**
 * CollisionDebugger for Story 2.4
 * Comprehensive debug system for collision detection visualization and performance monitoring
 */
import { EventBus, GameEventPayloads, GameEventType } from "../core/EventBus";
import { Rectangle, Circle, CollisionInfo } from "../../types/game.types";

export type DebugCollisionEvent = GameEventPayloads[GameEventType.COLLISION_DEBUG];

export interface CollisionMetrics {
  totalCollisions: number;
  collisionsPerSecond: number;
  spatialQueryTime: number;
  preciseCheckTime: number;
  averageEntitiesPerQuery: number;
  lastFrameCollisions: number;
}

export class CollisionDebugger {
  private enabled = false;
  private visualDebug = false;
  private showMetrics = false;
  private showSpatialGrid = false;
  
  private collisionHistory: DebugCollisionEvent[] = [];
  private maxHistorySize = 100;
  private metrics: CollisionMetrics = {
    totalCollisions: 0,
    collisionsPerSecond: 0,
    spatialQueryTime: 0,
    preciseCheckTime: 0,
    averageEntitiesPerQuery: 0,
    lastFrameCollisions: 0
  };
  
  private metricsUpdateInterval = 1000; // 1秒
  private lastMetricsUpdate = 0;
  private frameCollisionCount = 0;
  private performanceSamples: number[] = [];

  constructor(private eventBus: EventBus) {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for collision events
    this.eventBus.on(GameEventType.COLLISION_DEBUG, (data) => {
      this.recordCollision(data);
    });

    // Listen for F6 key press to toggle debug mode
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (event) => {
        if (event.key === 'F6') {
          event.preventDefault();
          this.toggle();
        } else if (event.key === 'F7' && this.enabled) {
          event.preventDefault();
          this.toggleVisualDebug();
        } else if (event.key === 'F8' && this.enabled) {
          event.preventDefault();
          this.toggleMetrics();
        } else if (event.key === 'F9' && this.enabled) {
          event.preventDefault();
          this.toggleSpatialGrid();
        }
      });
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled) {
      console.log('[CollisionDebugger] Debug mode enabled - F7: Visual, F8: Metrics, F9: Spatial Grid');
    } else {
      console.log('[CollisionDebugger] Debug mode disabled');
      this.visualDebug = false;
      this.showMetrics = false;
      this.showSpatialGrid = false;
    }
  }

  toggleVisualDebug(): void {
    this.visualDebug = !this.visualDebug;
    console.log(`[CollisionDebugger] Visual debug: ${this.visualDebug ? 'ON' : 'OFF'}`);
  }

  toggleMetrics(): void {
    this.showMetrics = !this.showMetrics;
    console.log(`[CollisionDebugger] Performance metrics: ${this.showMetrics ? 'ON' : 'OFF'}`);
  }

  toggleSpatialGrid(): void {
    this.showSpatialGrid = !this.showSpatialGrid;
    console.log(`[CollisionDebugger] Spatial grid visualization: ${this.showSpatialGrid ? 'ON' : 'OFF'}`);
  }

  recordCollision(event: DebugCollisionEvent): void {
    if (!this.enabled) return;

    this.collisionHistory.unshift(event);
    if (this.collisionHistory.length > this.maxHistorySize) {
      this.collisionHistory = this.collisionHistory.slice(0, this.maxHistorySize);
    }

    this.metrics.totalCollisions++;
    this.frameCollisionCount++;
    
    this.updateMetrics();
  }

  recordPerformanceMetrics(spatialTime: number, preciseTime: number, entitiesChecked: number): void {
    if (!this.enabled) return;

    this.metrics.spatialQueryTime = spatialTime;
    this.metrics.preciseCheckTime = preciseTime;
    this.metrics.averageEntitiesPerQuery = entitiesChecked;
    this.performanceSamples.push(spatialTime + preciseTime);

    // Keep only last 60 samples (1 second at 60fps)
    if (this.performanceSamples.length > 60) {
      this.performanceSamples.shift();
    }
  }

  private updateMetrics(): void {
    const now = Date.now();
    if (now - this.lastMetricsUpdate >= this.metricsUpdateInterval) {
      this.metrics.collisionsPerSecond = this.frameCollisionCount;
      this.metrics.lastFrameCollisions = this.frameCollisionCount;
      this.frameCollisionCount = 0;
      this.lastMetricsUpdate = now;
    }
  }

  // Visual debugging rendering methods
  renderCollisionBoxes(ctx: CanvasRenderingContext2D, entities: { id: string; bounds: Rectangle | Circle }[]): void {
    if (!this.enabled || !this.visualDebug) return;

    ctx.save();
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]);

    entities.forEach(entity => {
      if ('radius' in entity.bounds) {
        // Circle
        ctx.beginPath();
        ctx.arc(entity.bounds.x, entity.bounds.y, entity.bounds.radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else {
        // Rectangle
        ctx.strokeRect(entity.bounds.x, entity.bounds.y, entity.bounds.width, entity.bounds.height);
      }
    });

    ctx.restore();
  }

  renderSpatialGrid(ctx: CanvasRenderingContext2D, gridWidth: number, gridHeight: number, cellSize: number): void {
    if (!this.enabled || !this.showSpatialGrid) return;

    ctx.save();
    ctx.strokeStyle = '#ffff0050';
    ctx.lineWidth = 1;

    const cols = Math.ceil(gridWidth / cellSize);
    const rows = Math.ceil(gridHeight / cellSize);

    // Vertical lines
    for (let col = 0; col <= cols; col++) {
      const x = col * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, gridHeight);
      ctx.stroke();
    }

    // Horizontal lines
    for (let row = 0; row <= rows; row++) {
      const y = row * cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(gridWidth, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderMetrics(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled || !this.showMetrics) return;

    ctx.save();
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(10, 10, 300, 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    const lines = [
      `Collision Debug Metrics`,
      `─────────────────────────────`,
      `Total Collisions: ${this.metrics.totalCollisions}`,
      `Collisions/sec: ${this.metrics.collisionsPerSecond}`,
      `Spatial Query: ${this.metrics.spatialQueryTime.toFixed(2)}ms`,
      `Precise Check: ${this.metrics.preciseCheckTime.toFixed(2)}ms`,
      `Entities/Query: ${this.metrics.averageEntitiesPerQuery.toFixed(1)}`,
      `Last Frame: ${this.metrics.lastFrameCollisions} collisions`,
      ``,
      `Performance Avg: ${this.getAveragePerformance().toFixed(2)}ms`,
      `Recent Collisions: ${Math.min(5, this.collisionHistory.length)}`
    ];

    lines.forEach((line, index) => {
      ctx.fillText(line, 15, 30 + index * 14);
    });

    ctx.restore();
  }

  renderCollisionHistory(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled || !this.visualDebug) return;

    const recentCollisions = this.collisionHistory.slice(0, 10);
    const fadeTime = 2000; // 2秒でフェードアウト

    ctx.save();
    recentCollisions.forEach((collision, index) => {
      const age = Date.now() - collision.timestamp;
      if (age > fadeTime) return;

      const alpha = 1 - (age / fadeTime);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(collision.position.x, collision.position.y, 8 - index, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.restore();
  }

  private getAveragePerformance(): number {
    if (this.performanceSamples.length === 0) return 0;
    return this.performanceSamples.reduce((a, b) => a + b, 0) / this.performanceSamples.length;
  }

  getMetrics(): CollisionMetrics {
    return { ...this.metrics };
  }

  getCollisionHistory(count: number = 10): DebugCollisionEvent[] {
    return this.collisionHistory.slice(0, count);
  }

  clearHistory(): void {
    this.collisionHistory = [];
    this.metrics.totalCollisions = 0;
    this.frameCollisionCount = 0;
    this.performanceSamples = [];
  }

  // Debug utility methods
  logCollisionDetails(collision: DebugCollisionEvent): void {
    if (!this.enabled) return;

    console.group(`[Collision] ${collision.type} at ${new Date(collision.timestamp).toLocaleTimeString()}`);
    console.log('Entities:', collision.entityIds);
    console.log('Position:', collision.position);
    console.log('Normal:', collision.collisionInfo.normal);
    console.log('Penetration:', collision.collisionInfo.penetration);
    console.groupEnd();
  }

  isVisualDebugEnabled(): boolean {
    return this.enabled && this.visualDebug;
  }

  isMetricsEnabled(): boolean {
    return this.enabled && this.showMetrics;
  }

  isSpatialGridEnabled(): boolean {
    return this.enabled && this.showSpatialGrid;
  }
}
