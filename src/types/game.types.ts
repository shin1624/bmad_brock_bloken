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

export interface Vector2D {
  x: number;
  y: number;
}

// Input types
export type InputDevice = 'keyboard' | 'mouse' | 'touch';

export interface InputState {
  device: InputDevice;
  position?: Vector2D;
  keys?: Set<string>;
  isActive: boolean;
  timestamp: number;
}

// Paddle types
export interface PaddleState extends EntityState {
  size: Size;
  speed: number;
  inputDevice: InputDevice;
}

// Ball types
export interface BallState extends EntityState {
  radius: number;
  speed: number;
  maxSpeed: number;
  minSpeed: number;
}

export interface BallConfiguration {
  initialRadius: number;
  initialSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  initialPosition: Position;
  bounceDamping: number;
}

// Collision types
export interface CollisionInfo {
  collided: boolean;
  normal?: Vector2D;
  penetration?: number;
  contactPoint?: Vector2D;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Circle {
  x: number;
  y: number;
  radius: number;
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

// Game status types
export type GameStatus = "idle" | "playing" | "paused" | "gameOver" | "victory";

// Entity state for game objects
export interface EntityState {
  id: string;
  position: Position;
  velocity?: { dx: number; dy: number };
  active: boolean;
}

// Enhanced Game State for state management
export interface GameState {
  score: number;
  level: number;
  lives: number;
  gameStatus: GameStatus;
  balls: EntityState[];
  blocks: EntityState[];
  powerUps: EntityState[];
  combo: number;
  highScore: number;
}

// Game state subscriber type
export type GameStateSubscriber = (state: Readonly<GameState>) => void;

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
