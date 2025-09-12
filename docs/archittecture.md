# ブロック崩しゲーム アーキテクチャドキュメント

## 1. システム概要

### 1.1 アーキテクチャビジョン
本システムは、React（UIレイヤー）とCanvas API（ゲームレンダリング）を組み合わせたハイブリッドアーキテクチャを採用する。この設計により、高いパフォーマンスと優れた開発者体験を両立させ、拡張可能でメンテナンスしやすいゲームアプリケーションを実現する。

### 1.2 設計原則
- **関心の分離（SoC）**: UI、ゲームロジック、レンダリングを明確に分離
- **疎結合**: コンポーネント間の依存を最小化
- **高凝集**: 関連する機能をモジュール内にまとめる
- **DRY原則**: コードの重複を避ける
- **SOLID原則**: 特に単一責任原則とオープン・クローズド原則を重視
- **パフォーマンスファースト**: 60FPSを維持する設計

## 2. 技術スタック詳細

### 2.1 コア技術
```yaml
frontend:
  framework: React 18.3
  language: TypeScript 5.4
  build: Vite 5.x
  
rendering:
  primary: Canvas 2D API
  fallback: WebGL (将来的オプション)
  
state:
  ui: Zustand 4.x
  game: Custom GameStateManager
  
styling:
  primary: CSS Modules
  utility: Tailwind CSS 3.x
  
testing:
  unit: Vitest 1.x
  component: React Testing Library
  e2e: Playwright
  
quality:
  linting: ESLint 8.x
  formatting: Prettier 3.x
  type-checking: TypeScript strict mode
```

### 2.2 開発ツール
```yaml
development:
  ide: VSCode推奨
  debugger: React DevTools + Chrome DevTools
  performance: Chrome Performance Profiler
  version-control: Git + Conventional Commits
  package-manager: pnpm (推奨) / npm
```

## 3. システムアーキテクチャ

### 3.1 レイヤードアーキテクチャ
```
┌─────────────────────────────────────────────┐
│          Presentation Layer (React)          │
│  - Components (Menu, HUD, Settings, Editor)  │
└─────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────┐
│         Application Layer (Services)         │
│  - Game Service, Storage Service, Audio      │
└─────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────┐
│          Domain Layer (Game Core)            │
│  - Entities, Physics, Rules, State           │
└─────────────────────────────────────────────┘
                        ↕
┌─────────────────────────────────────────────┐
│       Infrastructure Layer (Canvas)          │
│  - Rendering, Input, Asset Loading           │
└─────────────────────────────────────────────┘
```

### 3.2 コンポーネント構成
```
App
├── GameContainer (React)
│   ├── MainMenu
│   ├── GameUI
│   │   ├── HUD
│   │   ├── PauseMenu
│   │   └── GameOverScreen
│   ├── SettingsPanel
│   └── LevelEditor
│
└── GameCanvas (Canvas)
    ├── GameEngine
    │   ├── GameLoop
    │   ├── StateManager
    │   └── EventBus
    ├── EntityManager
    │   ├── Ball
    │   ├── Paddle
    │   ├── Blocks
    │   └── PowerUps
    ├── Systems
    │   ├── PhysicsSystem
    │   ├── CollisionSystem
    │   ├── RenderingSystem
    │   └── ParticleSystem
    └── AssetManager
```

## 4. プロジェクト構造

```
src/
├── components/               # Reactコンポーネント
│   ├── common/              # 共通UIコンポーネント
│   │   ├── Button/
│   │   ├── Modal/
│   │   └── Icon/
│   ├── game/                # ゲーム関連UI
│   │   ├── GameContainer/
│   │   ├── HUD/
│   │   └── PauseMenu/
│   ├── menu/                # メニュー関連
│   │   ├── MainMenu/
│   │   ├── Settings/
│   │   └── HighScores/
│   └── editor/              # レベルエディター
│       ├── EditorCanvas/
│       ├── BlockPalette/
│       └── EditorTools/
│
├── game/                    # ゲームエンジン
│   ├── core/               # コアシステム
│   │   ├── GameEngine.ts
│   │   ├── GameLoop.ts
│   │   ├── GameState.ts
│   │   └── EventBus.ts
│   ├── entities/           # ゲームエンティティ
│   │   ├── Entity.ts
│   │   ├── Ball.ts
│   │   ├── Paddle.ts
│   │   ├── Block.ts
│   │   └── PowerUp.ts
│   ├── systems/            # ゲームシステム
│   │   ├── PhysicsSystem.ts
│   │   ├── CollisionSystem.ts
│   │   ├── RenderingSystem.ts
│   │   ├── ParticleSystem.ts
│   │   └── AudioSystem.ts
│   ├── physics/            # 物理演算
│   │   ├── Vector2D.ts
│   │   ├── Collision.ts
│   │   └── Movement.ts
│   ├── rendering/          # レンダリング
│   │   ├── Renderer.ts
│   │   ├── SpriteSheet.ts
│   │   └── Effects.ts
│   └── plugins/            # プラグインシステム
│       ├── PluginManager.ts
│       ├── PowerUpPlugin.ts
│       └── ThemePlugin.ts
│
├── stores/                  # 状態管理
│   ├── gameStore.ts        # Zustand store
│   ├── uiStore.ts
│   └── settingsStore.ts
│
├── services/               # サービスレイヤー
│   ├── GameService.ts
│   ├── StorageService.ts
│   ├── AudioService.ts
│   └── LevelService.ts
│
├── hooks/                  # カスタムフック
│   ├── useGameEngine.ts
│   ├── useKeyboard.ts
│   ├── useTouch.ts
│   └── useResponsive.ts
│
├── utils/                  # ユーティリティ
│   ├── math.ts
│   ├── collision.ts
│   ├── helpers.ts
│   └── constants.ts
│
├── types/                  # TypeScript型定義
│   ├── game.types.ts
│   ├── ui.types.ts
│   └── plugin.types.ts
│
├── assets/                 # アセット
│   ├── sprites/
│   ├── sounds/
│   └── levels/
│
└── themes/                 # テーマ定義
    ├── neon.ts
    ├── pixel.ts
    ├── synthwave.ts
    └── minimal.ts
```

## 5. コア設計パターン

### 5.1 Entity-Component-System (ECS)
```typescript
// Entity基底クラス
abstract class Entity {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  components: Map<string, Component>;
  
  abstract update(deltaTime: number): void;
  abstract render(ctx: CanvasRenderingContext2D): void;
}

// Componentインターフェース
interface Component {
  type: ComponentType;
  update(entity: Entity, deltaTime: number): void;
}

// System基底クラス
abstract class System {
  abstract process(entities: Entity[], deltaTime: number): void;
}
```

### 5.2 イベント駆動アーキテクチャ
```typescript
// イベントバス実装
class EventBus {
  private events: Map<string, Set<EventHandler>>;
  
  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }
  
  emit(event: string, data?: any): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }
  
  off(event: string, handler: EventHandler): void {
    this.events.get(event)?.delete(handler);
  }
}

// 使用例
eventBus.on('block:destroyed', (data) => {
  particleSystem.createExplosion(data.position);
  scoreManager.addPoints(data.points);
  audioSystem.playSound('blockBreak');
});
```

### 5.3 プラグインアーキテクチャ
```typescript
// プラグインインターフェース
interface Plugin {
  name: string;
  version: string;
  init(game: GameEngine): void;
  destroy(): void;
}

// プラグインマネージャー
class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    plugin.init(this.gameEngine);
  }
  
  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (plugin) {
      plugin.destroy();
      this.plugins.delete(name);
    }
  }
}

// カスタムパワーアッププラグイン例
class CustomPowerUpPlugin implements Plugin {
  name = 'CustomPowerUp';
  version = '1.0.0';
  
  init(game: GameEngine): void {
    game.powerUpManager.register({
      type: 'custom',
      effect: this.applyEffect,
      duration: 10000
    });
  }
  
  applyEffect(game: GameEngine): void {
    // カスタム効果の実装
  }
  
  destroy(): void {
    // クリーンアップ
  }
}
```

## 6. データフローアーキテクチャ

### 6.1 単方向データフロー
```
User Input → Event Handler → State Update → Re-render
     ↑                                           ↓
     └────────── Visual Feedback ←──────────────┘
```

### 6.2 状態管理戦略
```typescript
// UI状態 (Zustand)
interface UIState {
  currentScreen: Screen;
  isPaused: boolean;
  selectedTheme: string;
  volume: number;
  
  setScreen: (screen: Screen) => void;
  togglePause: () => void;
  setTheme: (theme: string) => void;
  setVolume: (volume: number) => void;
}

// ゲーム状態 (カスタム)
class GameStateManager {
  private state: GameState = {
    score: 0,
    level: 1,
    lives: 3,
    balls: [],
    blocks: [],
    powerUps: [],
    gameStatus: 'idle'
  };
  
  private subscribers: Set<StateSubscriber> = new Set();
  
  updateState(updater: (state: GameState) => GameState): void {
    this.state = updater(this.state);
    this.notifySubscribers();
  }
  
  subscribe(subscriber: StateSubscriber): void {
    this.subscribers.add(subscriber);
  }
  
  private notifySubscribers(): void {
    this.subscribers.forEach(sub => sub(this.state));
  }
}
```

## 7. レンダリングパイプライン

### 7.1 レンダリング最適化
```typescript
class RenderingSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;
  
  render(entities: Entity[], deltaTime: number): void {
    // ダブルバッファリング
    this.clearOffscreen();
    
    // レイヤー別レンダリング
    this.renderBackground();
    this.renderEntities(entities);
    this.renderEffects();
    this.renderUI();
    
    // 画面に転送
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }
  
  private renderEntities(entities: Entity[]): void {
    // フラスタムカリング
    const visibleEntities = entities.filter(e => 
      this.isInViewport(e.position, e.bounds)
    );
    
    // Zオーダーソート
    visibleEntities.sort((a, b) => a.zIndex - b.zIndex);
    
    // バッチレンダリング
    visibleEntities.forEach(entity => {
      entity.render(this.offscreenCtx);
    });
  }
}
```

### 7.2 パフォーマンス最適化
```typescript
// オブジェクトプール
class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;
  
  constructor(factory: () => T, reset: (obj: T) => void, size: number) {
    this.factory = factory;
    this.reset = reset;
    
    // 事前割り当て
    for (let i = 0; i < size; i++) {
      this.pool.push(factory());
    }
  }
  
  get(): T {
    return this.pool.pop() || this.factory();
  }
  
  release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }
}

// 使用例：パーティクルプール
const particlePool = new ObjectPool(
  () => new Particle(),
  (p) => p.reset(),
  1000
);
```

## 8. React-Canvas統合

### 8.1 ブリッジパターン
```typescript
// React-Canvas ブリッジ
const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { gameState, updateGameState } = useGameStore();
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // ゲームエンジン初期化
    engineRef.current = new GameEngine(canvasRef.current);
    
    // 双方向バインディング
    engineRef.current.onStateChange((newState) => {
      updateGameState(newState);
    });
    
    // エンジン開始
    engineRef.current.start();
    
    return () => {
      engineRef.current?.destroy();
    };
  }, []);
  
  // React UIからのコマンド処理
  useEffect(() => {
    if (gameState.isPaused) {
      engineRef.current?.pause();
    } else {
      engineRef.current?.resume();
    }
  }, [gameState.isPaused]);
  
  return <canvas ref={canvasRef} width={800} height={600} />;
};
```

### 8.2 カスタムフック
```typescript
// ゲームエンジンフック
function useGameEngine(canvasRef: RefObject<HTMLCanvasElement>) {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const gameEngine = new GameEngine(canvasRef.current);
    
    gameEngine.onLoad(() => setIsLoaded(true));
    setEngine(gameEngine);
    
    return () => gameEngine.destroy();
  }, [canvasRef]);
  
  return { engine, isLoaded };
}

// 入力処理フック
function useGameInput(engine: GameEngine | null) {
  useEffect(() => {
    if (!engine) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      engine.handleInput('keydown', e.key);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      engine.handleInput('keyup', e.key);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [engine]);
}
```

## 9. コーディング標準

### 9.1 TypeScript規約
```typescript
// ✅ Good: 明示的な型定義
interface Position {
  x: number;
  y: number;
}

interface Velocity {
  dx: number;
  dy: number;
}

class Ball {
  constructor(
    private position: Position,
    private velocity: Velocity
  ) {}
}

// ❌ Bad: any型の使用
class Ball {
  constructor(private data: any) {}
}
```

### 9.2 命名規約
```typescript
// クラス: PascalCase
class GameEngine {}

// インターフェース: PascalCase + 'I'プレフィックス不要
interface Plugin {}

// 関数・メソッド: camelCase
function calculateScore() {}

// 定数: UPPER_SNAKE_CASE
const MAX_SPEED = 10;

// Private: アンダースコアプレフィックス不要
private gameState: GameState;
```

### 9.3 ファイル構成
```typescript
// 1ファイル1エクスポート原則
// Ball.ts
export class Ball extends Entity {
  // 実装
}

// index.ts でバレルエクスポート
export { Ball } from './Ball';
export { Paddle } from './Paddle';
export { Block } from './Block';
```

## 10. テスト戦略

### 10.1 テストピラミッド
```
         /\
        /E2E\      (10%) - Playwright
       /------\
      /統合テスト\   (30%) - React Testing Library
     /----------\
    /ユニットテスト\  (60%) - Vitest
   /--------------\
```

### 10.2 テスト例
```typescript
// ユニットテスト例
describe('Ball', () => {
  it('should bounce off walls correctly', () => {
    const ball = new Ball({ x: 100, y: 100 }, { dx: 5, dy: 5 });
    ball.update(16); // 1フレーム更新
    
    expect(ball.position.x).toBe(105);
    expect(ball.position.y).toBe(105);
  });
  
  it('should reverse velocity on collision', () => {
    const ball = new Ball({ x: 0, y: 100 }, { dx: -5, dy: 5 });
    ball.checkWallCollision({ width: 800, height: 600 });
    
    expect(ball.velocity.dx).toBe(5); // 反転
    expect(ball.velocity.dy).toBe(5); // 変化なし
  });
});

// 統合テスト例
describe('GameUI', () => {
  it('should start game when start button clicked', async () => {
    render(<GameContainer />);
    
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
    });
  });
});
```

## 11. パフォーマンス最適化

### 11.1 最適化テクニック
```typescript
// 1. RequestAnimationFrame最適化
class GameLoop {
  private lastTime = 0;
  private accumulator = 0;
  private readonly FIXED_TIMESTEP = 1000 / 60; // 60 FPS
  
  start(): void {
    requestAnimationFrame(this.loop.bind(this));
  }
  
  private loop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.accumulator += deltaTime;
    
    // 固定タイムステップ
    while (this.accumulator >= this.FIXED_TIMESTEP) {
      this.update(this.FIXED_TIMESTEP);
      this.accumulator -= this.FIXED_TIMESTEP;
    }
    
    // 補間レンダリング
    const alpha = this.accumulator / this.FIXED_TIMESTEP;
    this.render(alpha);
    
    requestAnimationFrame(this.loop.bind(this));
  }
}

// 2. 空間分割による衝突検出最適化
class SpatialHash {
  private grid: Map<string, Set<Entity>>;
  private cellSize: number;
  
  constructor(cellSize: number) {
    this.grid = new Map();
    this.cellSize = cellSize;
  }
  
  insert(entity: Entity): void {
    const cells = this.getCells(entity);
    cells.forEach(cell => {
      if (!this.grid.has(cell)) {
        this.grid.set(cell, new Set());
      }
      this.grid.get(cell)!.add(entity);
    });
  }
  
  getNearby(entity: Entity): Entity[] {
    const cells = this.getCells(entity);
    const nearby = new Set<Entity>();
    
    cells.forEach(cell => {
      const entities = this.grid.get(cell);
      if (entities) {
        entities.forEach(e => {
          if (e !== entity) nearby.add(e);
        });
      }
    });
    
    return Array.from(nearby);
  }
  
  private getCells(entity: Entity): string[] {
    // エンティティが占めるセルを計算
    const minX = Math.floor(entity.bounds.left / this.cellSize);
    const maxX = Math.floor(entity.bounds.right / this.cellSize);
    const minY = Math.floor(entity.bounds.top / this.cellSize);
    const maxY = Math.floor(entity.bounds.bottom / this.cellSize);
    
    const cells: string[] = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x},${y}`);
      }
    }
    return cells;
  }
}
```

### 11.2 メモリ管理
```typescript
// WeakMapによる自動メモリ管理
class EntityCache {
  private cache = new WeakMap<Entity, CachedData>();
  
  set(entity: Entity, data: CachedData): void {
    this.cache.set(entity, data);
  }
  
  get(entity: Entity): CachedData | undefined {
    return this.cache.get(entity);
  }
}

// メモリリーク防止
class ResourceManager {
  private resources = new Map<string, Resource>();
  private refCounts = new Map<string, number>();
  
  load(id: string, resource: Resource): void {
    this.resources.set(id, resource);
    this.refCounts.set(id, 0);
  }
  
  acquire(id: string): Resource | undefined {
    const resource = this.resources.get(id);
    if (resource) {
      const count = this.refCounts.get(id) || 0;
      this.refCounts.set(id, count + 1);
    }
    return resource;
  }
  
  release(id: string): void {
    const count = this.refCounts.get(id);
    if (count !== undefined && count > 0) {
      this.refCounts.set(id, count - 1);
      if (count - 1 === 0) {
        // リソースを解放
        this.resources.delete(id);
        this.refCounts.delete(id);
      }
    }
  }
}
```

## 12. セキュリティ考慮事項

### 12.1 入力検証
```typescript
class InputValidator {
  static validateLevelData(data: unknown): LevelData {
    // スキーマ検証
    if (!this.isValidLevelSchema(data)) {
      throw new Error('Invalid level data');
    }
    
    // サニタイゼーション
    return this.sanitizeLevelData(data as LevelData);
  }
  
  private static sanitizeLevelData(data: LevelData): LevelData {
    return {
      ...data,
      name: this.sanitizeString(data.name),
      blocks: data.blocks.map(block => ({
        ...block,
        type: this.validateBlockType(block.type)
      }))
    };
  }
}
```

### 12.2 XSS対策
```typescript
// ユーザー入力のエスケープ
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Content Security Policy
const CSP_HEADER = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "media-src 'self';"
};
```

## 13. デプロイメントアーキテクチャ

### 13.1 ビルドパイプライン
```yaml
# CI/CD Pipeline
stages:
  - lint
  - test
  - build
  - deploy

lint:
  script:
    - pnpm lint
    - pnpm type-check

test:
  script:
    - pnpm test:unit
    - pnpm test:integration
    - pnpm test:e2e

build:
  script:
    - pnpm build
    - pnpm build:analyze
  artifacts:
    paths:
      - dist/

deploy:
  script:
    - pnpm deploy
```

### 13.2 環境設定
```typescript
// 環境別設定
interface Config {
  apiUrl: string;
  debug: boolean;
  analytics: boolean;
}

const configs: Record<string, Config> = {
  development: {
    apiUrl: 'http://localhost:3000',
    debug: true,
    analytics: false
  },
  staging: {
    apiUrl: 'https://staging.api.example.com',
    debug: true,
    analytics: true
  },
  production: {
    apiUrl: 'https://api.example.com',
    debug: false,
    analytics: true
  }
};

export const config = configs[import.meta.env.MODE || 'development'];
```

## 14. 監視とロギング

### 14.1 パフォーマンス監視
```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startMeasure(label: string): void {
    performance.mark(`${label}-start`);
  }
  
  endMeasure(label: string): void {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    this.recordMetric(label, measure.duration);
  }
  
  private recordMetric(label: string, value: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    this.metrics.get(label)!.push(value);
    
    // 統計情報の計算
    if (this.metrics.get(label)!.length % 100 === 0) {
      this.reportStatistics(label);
    }
  }
  
  private reportStatistics(label: string): void {
    const values = this.metrics.get(label)!;
    const avg = values.reduce((a, b) => a + b) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    console.log(`[Performance] ${label}: avg=${avg.toFixed(2)}ms, min=${min.toFixed(2)}ms, max=${max.toFixed(2)}ms`);
  }
}
```

### 14.2 エラートラッキング
```typescript
class ErrorTracker {
  static logError(error: Error, context?: any): void {
    console.error('[Error]', error.message, {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
    
    // 本番環境では外部サービスに送信
    if (config.analytics) {
      // Sentryなどに送信
      this.sendToAnalytics(error, context);
    }
  }
  
  private static sendToAnalytics(error: Error, context?: any): void {
    // 実装
  }
}
```

## 15. 今後の拡張計画

### 15.1 スケーラビリティ考慮
- WebWorkerによる物理演算の並列化
- WebAssemblyによるパフォーマンスクリティカルな処理の高速化
- IndexedDBによる大容量データの永続化
- PWA対応によるオフラインプレイ

### 15.2 技術的負債の管理
- 定期的なリファクタリング
- 依存関係の更新
- パフォーマンス監査
- セキュリティ監査

### 15.3 データ永続化戦略
```typescript
// ストレージファクトリーパターン
class StorageFactory {
  static async getStorage(): Promise<Storage> {
    // 1. IndexedDBが利用可能か確認
    if ('indexedDB' in window) {
      try {
        const db = await this.openIndexedDB();
        return new IndexedDBStorage(db);
      } catch (error) {
        console.warn('IndexedDB failed, falling back to localStorage', error);
      }
    }
    
    // 2. LocalStorageへフォールバック
    if ('localStorage' in window) {
      try {
        // 容量チェック（5MB制限）
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        return new LocalStorageAdapter();
      } catch (error) {
        console.warn('localStorage failed, falling back to memory', error);
      }
    }
    
    // 3. メモリストレージへフォールバック（セッション限定）
    return new MemoryStorage();
  }
  
  private static openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BlockBreakerDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // オブジェクトストア作成
        if (!db.objectStoreNames.contains('levels')) {
          db.createObjectStore('levels', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('scores')) {
          db.createObjectStore('scores', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }
}
```

## まとめ

このアーキテクチャドキュメントは、高性能で拡張可能なブロック崩しゲームの技術的基盤を定義している。React + Canvasのハイブリッドアプローチにより、優れたユーザー体験と開発者体験の両立を実現し、将来の拡張にも対応できる柔軟な設計となっている。