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

// Block system types
export enum BlockType {
  Normal = 'normal',
  Hard = 'hard',
  Indestructible = 'indestructible'
}

export interface BlockConfiguration {
  type: BlockType;
  maxHitPoints: number;
  scoreValue: number;
  color: string;
  width: number;  // 75px
  height: number; // 25px
}

export interface BlockState extends EntityState {
  type: BlockType;
  currentHitPoints: number;
  maxHitPoints: number;
  isDestroyed: boolean;
  scoreValue: number;
  gridRow: number;
  gridColumn: number;
}

export interface GridLayout {
  columns: number;    // 10列
  rows: number;      // 8行
  cellWidth: number; // 75px
  cellHeight: number; // 25px
  spacing: number;   // 5px
  offsetX: number;   // グリッド開始X座標
  offsetY: number;   // グリッド開始Y座標
}

export interface ParticleConfig {
  count: number;        // 8個
  lifespan: number;     // 0.5秒
  velocity: Vector2D;   // 初期速度範囲
  gravity: number;      // 重力加速度
  color: string;        // ブロック色ベース
}

// Enhanced Game State for state management
export interface GameState {
  score: number;
  level: number;
  lives: number;
  gameStatus: GameStatus;
  balls: EntityState[];
  blocks: BlockState[];
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
