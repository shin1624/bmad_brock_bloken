/**
 * Ball physics control panel for testing and debugging
 * Provides UI controls for ball management and physics parameters
 */
import React, { useState } from 'react';
import { Ball } from '../../game/entities/Ball';
import { BallConfiguration, Vector2D } from '../../types/game.types';

export interface BallControlsProps {
  balls: Ball[];
  isPhysicsRunning: boolean;
  onAddBall: (config?: Partial<BallConfiguration>) => void;
  onRemoveBall: (ballId: string) => void;
  onRemoveAllBalls: () => void;
  onResetBall: (ballId: string, config?: Partial<BallConfiguration>) => void;
  onSetBallVelocity: (ballId: string, velocity: Vector2D) => void;
  onPausePhysics: () => void;
  onResumePhysics: () => void;
  className?: string;
}

export const BallControls: React.FC<BallControlsProps> = ({
  balls,
  isPhysicsRunning,
  onAddBall,
  onRemoveBall,
  onRemoveAllBalls,
  onResetBall,
  onSetBallVelocity,
  onPausePhysics,
  onResumePhysics,
  className = ''
}) => {
  // Local state for ball configuration
  const [ballConfig, setBallConfig] = useState<Partial<BallConfiguration>>({
    initialRadius: 10,
    initialSpeed: 200,
    maxSpeed: 500,
    minSpeed: 50,
    initialPosition: { x: 400, y: 300 },
    bounceDamping: 0.95
  });

  // Selected ball for individual control
  const [selectedBallId, setSelectedBallId] = useState<string>('');
  const selectedBall = balls.find(ball => ball.id === selectedBallId);

  // Velocity input for selected ball
  const [velocityInput, setVelocityInput] = useState<Vector2D>({ x: 200, y: 0 });

  const handleAddBall = () => {
    onAddBall(ballConfig);
  };

  const handleRemoveSelectedBall = () => {
    if (selectedBallId) {
      onRemoveBall(selectedBallId);
      setSelectedBallId('');
    }
  };

  const handleResetSelectedBall = () => {
    if (selectedBallId) {
      onResetBall(selectedBallId, ballConfig);
    }
  };

  const handleSetVelocity = () => {
    if (selectedBallId) {
      onSetBallVelocity(selectedBallId, velocityInput);
    }
  };

  const handlePhysicsToggle = () => {
    if (isPhysicsRunning) {
      onPausePhysics();
    } else {
      onResumePhysics();
    }
  };

  return (
    <div className={`bg-gray-800 text-white p-4 rounded-lg ${className}`}>
      <h3 className="text-lg font-bold mb-4">Ball Physics Controls</h3>

      {/* Physics State */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span>Physics Status:</span>
          <span className={`px-2 py-1 rounded ${isPhysicsRunning ? 'bg-green-600' : 'bg-red-600'}`}>
            {isPhysicsRunning ? 'Running' : 'Paused'}
          </span>
        </div>
        <button
          onClick={handlePhysicsToggle}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          {isPhysicsRunning ? 'Pause Physics' : 'Resume Physics'}
        </button>
      </div>

      {/* Ball Count */}
      <div className="mb-4">
        <span>Active Balls: {balls.filter(ball => ball.active).length} / {balls.length}</span>
      </div>

      {/* Ball Configuration */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">New Ball Configuration</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <label className="block">Radius:</label>
            <input
              type="number"
              value={ballConfig.initialRadius || 10}
              onChange={(e) => setBallConfig(prev => ({ ...prev, initialRadius: Number(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-2 py-1"
              min="5"
              max="50"
            />
          </div>
          <div>
            <label className="block">Speed:</label>
            <input
              type="number"
              value={ballConfig.initialSpeed || 200}
              onChange={(e) => setBallConfig(prev => ({ ...prev, initialSpeed: Number(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-2 py-1"
              min="10"
              max="1000"
            />
          </div>
          <div>
            <label className="block">Max Speed:</label>
            <input
              type="number"
              value={ballConfig.maxSpeed || 500}
              onChange={(e) => setBallConfig(prev => ({ ...prev, maxSpeed: Number(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-2 py-1"
              min="50"
              max="2000"
            />
          </div>
          <div>
            <label className="block">Min Speed:</label>
            <input
              type="number"
              value={ballConfig.minSpeed || 50}
              onChange={(e) => setBallConfig(prev => ({ ...prev, minSpeed: Number(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-2 py-1"
              min="10"
              max="500"
            />
          </div>
          <div>
            <label className="block">Bounce Damping:</label>
            <input
              type="number"
              value={ballConfig.bounceDamping || 0.95}
              onChange={(e) => setBallConfig(prev => ({ ...prev, bounceDamping: Number(e.target.value) }))}
              className="w-full bg-gray-700 rounded px-2 py-1"
              min="0.1"
              max="1.0"
              step="0.05"
            />
          </div>
        </div>
      </div>

      {/* Ball Management */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Ball Management</h4>
        <div className="flex gap-2">
          <button
            onClick={handleAddBall}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
          >
            Add Ball
          </button>
          <button
            onClick={onRemoveAllBalls}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
            disabled={balls.length === 0}
          >
            Remove All
          </button>
        </div>
      </div>

      {/* Ball Selection */}
      {balls.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold mb-2">Individual Ball Control</h4>
          <select
            value={selectedBallId}
            onChange={(e) => setSelectedBallId(e.target.value)}
            className="w-full bg-gray-700 rounded px-2 py-1 mb-2"
          >
            <option value="">Select a ball...</option>
            {balls.map((ball, index) => (
              <option key={ball.id} value={ball.id}>
                Ball {index + 1} ({ball.active ? 'Active' : 'Inactive'})
              </option>
            ))}
          </select>

          {selectedBall && (
            <div className="space-y-2">
              {/* Ball Info */}
              <div className="text-sm bg-gray-700 p-2 rounded">
                <div>Position: ({Math.round(selectedBall.position.x)}, {Math.round(selectedBall.position.y)})</div>
                <div>Velocity: ({Math.round(selectedBall.velocity.x)}, {Math.round(selectedBall.velocity.y)})</div>
                <div>Speed: {Math.round(selectedBall.speed)}</div>
                <div>Radius: {selectedBall.radius}</div>
              </div>

              {/* Velocity Control */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm">Velocity X:</label>
                  <input
                    type="number"
                    value={velocityInput.x}
                    onChange={(e) => setVelocityInput(prev => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-full bg-gray-700 rounded px-2 py-1"
                    min="-1000"
                    max="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm">Velocity Y:</label>
                  <input
                    type="number"
                    value={velocityInput.y}
                    onChange={(e) => setVelocityInput(prev => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-full bg-gray-700 rounded px-2 py-1"
                    min="-1000"
                    max="1000"
                  />
                </div>
              </div>

              {/* Ball Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleSetVelocity}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Set Velocity
                </button>
                <button
                  onClick={handleResetSelectedBall}
                  className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
                >
                  Reset
                </button>
                <button
                  onClick={handleRemoveSelectedBall}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};