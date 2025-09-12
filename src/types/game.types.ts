/**
 * Core game types for Canvas Game Engine
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface PerformanceMetrics {
  fps: number;
  deltaTime: number;
  averageFps: number;
  frameCount: number;
  lastFrameTime: number;
}

export interface GameLoopConfig {
  targetFps: number;
  enablePerformanceMonitoring: boolean;
}

export interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  currentTime: number;
  performance: PerformanceMetrics;
}

export type GameLoopCallback = (deltaTime: number, currentTime: number) => void;

export interface GameLoopInterface {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  isRunning(): boolean;
  isPaused(): boolean;
  getPerformanceMetrics(): PerformanceMetrics;
  onUpdate(callback: GameLoopCallback): void;
  onRender(callback: GameLoopCallback): void;
}
