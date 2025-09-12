# 8. React-Canvas統合

## 8.1 ブリッジパターン
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

## 8.2 カスタムフック
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
