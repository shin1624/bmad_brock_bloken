import { useState, useCallback } from 'react';
import GameCanvas from './components/game/GameCanvas';
import { GameEngine } from './game/core/GameEngine';
import './App.css';

function App() {
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState({
    isRunning: false,
    isPaused: false,
    isDebugMode: false,
    fps: 0,
  });

  const handleEngineReady = useCallback((gameEngine: GameEngine) => {
    setEngine(gameEngine);
    console.log('Game engine ready!', gameEngine);
  }, []);

  const handleStateChange = useCallback((state: any) => {
    setGameState(state);
  }, []);

  const handleFpsUpdate = useCallback((fps: number) => {
    // Update FPS in real-time if needed
  }, []);

  const togglePause = () => {
    if (!engine) return;

    if (gameState.isPaused) {
      engine.resume();
    } else {
      engine.pause();
    }
  };

  const toggleDebug = () => {
    if (engine) {
      engine.toggleDebug();
    }
  };

  return (
    <>
      <div style={{ padding: '20px' }}>
        <h1>Canvas Game Engine Demo</h1>

        {/* Game Status Display */}
        <div style={{ marginBottom: '20px', fontFamily: 'monospace' }}>
          <div>
            Status:{' '}
            {gameState.isRunning
              ? gameState.isPaused
                ? 'PAUSED'
                : 'RUNNING'
              : 'STOPPED'}
          </div>
          <div>FPS: {gameState.fps}</div>
          <div>Debug Mode: {gameState.isDebugMode ? 'ON' : 'OFF'}</div>
        </div>

        {/* Control Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={togglePause}
            disabled={!engine || !gameState.isRunning}
            style={{ marginRight: '10px' }}
          >
            {gameState.isPaused ? 'Resume' : 'Pause'}
          </button>

          <button
            onClick={toggleDebug}
            disabled={!engine}
            style={{ marginRight: '10px' }}
          >
            Toggle Debug
          </button>
        </div>

        {/* Instructions */}
        <div style={{ marginBottom: '20px', fontSize: '14px', color: '#666' }}>
          <p>
            <strong>Keyboard Controls:</strong>
          </p>
          <ul>
            <li>
              <kbd>Space</kbd> - Pause/Resume
            </li>
            <li>
              <kbd>D</kbd> - Toggle Debug Mode
            </li>
          </ul>
        </div>

        {/* Game Canvas */}
        <div
          style={{
            border: '2px solid #333',
            borderRadius: '8px',
            overflow: 'hidden',
            width: '800px',
            height: '600px',
            maxWidth: '100%',
          }}
        >
          <GameCanvas
            width={800}
            height={600}
            onEngineReady={handleEngineReady}
            onStateChange={handleStateChange}
            onFpsUpdate={handleFpsUpdate}
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
            }}
          />
        </div>

        {/* Technical Info */}
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
          <p>Canvas Game Engine v1.0 - Story 1.2 Implementation</p>
          <p>Built with React 18 + TypeScript + Canvas API</p>
        </div>
      </div>
    </>
  );
}

export default App;
