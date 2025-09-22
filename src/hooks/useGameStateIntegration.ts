/**
 * Game State Integration Hook
 * Story 4.1, Task 4: React-Canvas bridge for power-up system
 * Synchronizes game state with React UI components and animations
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  PowerUpType,
  ActivePowerUp,
} from "../components/game/HUD/PowerUpStatus";
import {
  PowerUpAnimationEvent,
  PowerUpAnimationType,
} from "../components/game/animations/PowerUpAnimations";

// Game state interface for power-ups
export interface GamePowerUpState {
  id: string;
  type: PowerUpType;
  position: { x: number; y: number };
  active: boolean;
  collected: boolean;
  timeRemaining: number;
  maxDuration: number;
}

// Integration configuration
interface GameStateIntegrationConfig {
  updateInterval: number; // ms
  animationEnabled: boolean;
  debugMode: boolean;
}

// Hook return type
interface GameStateIntegration {
  // UI state
  activePowerUps: ActivePowerUp[];
  animations: PowerUpAnimationEvent[];

  // Game events
  onPowerUpSpawn: (powerUp: GamePowerUpState) => void;
  onPowerUpPickup: (
    powerUpId: string,
    position: { x: number; y: number },
  ) => void;
  onPowerUpActivate: (powerUpId: string) => void;
  onPowerUpExpire: (powerUpId: string) => void;

  // Animation management
  clearAnimation: (animationId: string) => void;
  clearAllAnimations: () => void;

  // Debug utilities
  debugInfo: {
    powerUpCount: number;
    animationCount: number;
    updateRate: number;
  };
}

const DEFAULT_CONFIG: GameStateIntegrationConfig = {
  updateInterval: 50, // 20 FPS for UI updates
  animationEnabled: true,
  debugMode: false,
};

export const useGameStateIntegration = (
  config: Partial<GameStateIntegrationConfig> = {},
): GameStateIntegration => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // State management
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [animations, setAnimations] = useState<PowerUpAnimationEvent[]>([]);
  const [debugInfo, setDebugInfo] = useState({
    powerUpCount: 0,
    animationCount: 0,
    updateRate: 0,
  });

  // Refs for performance tracking
  const lastUpdateTime = useRef<number>(Date.now());
  const updateCounter = useRef<number>(0);
  const powerUpRegistry = useRef<Map<string, GamePowerUpState>>(new Map());

  // Update power-up durations and cleanup expired ones
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastUpdateTime.current;
      lastUpdateTime.current = now;
      updateCounter.current++;

      setActivePowerUps((prevPowerUps) => {
        const updatedPowerUps = prevPowerUps
          .map((powerUp) => {
            const newDuration = Math.max(0, powerUp.duration - deltaTime);
            return {
              ...powerUp,
              duration: newDuration,
            };
          })
          .filter((powerUp) => powerUp.duration > 0);

        // Remove expired power-ups from registry
        const activePowerUpIds = new Set(updatedPowerUps.map((p) => p.id));
        for (const [id] of powerUpRegistry.current) {
          if (!activePowerUpIds.has(id)) {
            powerUpRegistry.current.delete(id);
          }
        }

        return updatedPowerUps;
      });

      // Update debug info every second
      if (updateCounter.current % 20 === 0) {
        // Assuming 50ms interval = 20 updates/second
        setDebugInfo((_prev) => ({
          powerUpCount: powerUpRegistry.current.size,
          animationCount: animations.length,
          updateRate: 1000 / deltaTime,
        }));
      }
    }, finalConfig.updateInterval);

    return () => clearInterval(interval);
  }, [finalConfig.updateInterval, animations.length]);

  // Helper function to get power-up metadata
  const getPowerUpMetadata = (type: PowerUpType) => {
    const metadataMap: Record<
      PowerUpType,
      { icon: string; color: string; name: string }
    > = {
      [PowerUpType.MultiBall]: {
        icon: "⚡",
        color: "#ff6b6b",
        name: "Multi Ball",
      },
      [PowerUpType.PaddleSize]: {
        icon: "🏓",
        color: "#4ecdc4",
        name: "Paddle Size",
      },
      [PowerUpType.BallSpeed]: {
        icon: "💨",
        color: "#45b7d1",
        name: "Ball Speed",
      },
      [PowerUpType.Penetration]: {
        icon: "🎯",
        color: "#96ceb4",
        name: "Penetration",
      },
      [PowerUpType.Magnet]: { icon: "🧲", color: "#feca57", name: "Magnet" },
    };
    return (
      metadataMap[type] || { icon: "❓", color: "#999999", name: "Unknown" }
    );
  };

  // Generate unique animation ID
  const generateAnimationId = (): string => {
    return `anim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Event handlers
  const onPowerUpSpawn = useCallback(
    (powerUp: GamePowerUpState) => {
      powerUpRegistry.current.set(powerUp.id, powerUp);

      if (finalConfig.animationEnabled) {
        const metadata = getPowerUpMetadata(powerUp.type);
        const spawnAnimation: PowerUpAnimationEvent = {
          id: generateAnimationId(),
          type: PowerUpAnimationType.Spawn,
          powerUpType: powerUp.type,
          position: powerUp.position,
          color: metadata.color,
          icon: metadata.icon,
          duration: 1000,
        };

        setAnimations((prev) => [...prev, spawnAnimation]);
      }

      if (finalConfig.debugMode) {
        console.log(
          `PowerUp spawned: ${powerUp.type} at (${powerUp.position.x}, ${powerUp.position.y})`,
        );
      }
    },
    [finalConfig.animationEnabled, finalConfig.debugMode],
  );

  const onPowerUpPickup = useCallback(
    (powerUpId: string, position: { x: number; y: number }) => {
      const powerUp = powerUpRegistry.current.get(powerUpId);
      if (!powerUp) return;

      if (finalConfig.animationEnabled) {
        const metadata = getPowerUpMetadata(powerUp.type);
        const pickupAnimation: PowerUpAnimationEvent = {
          id: generateAnimationId(),
          type: PowerUpAnimationType.Pickup,
          powerUpType: powerUp.type,
          position,
          color: metadata.color,
          icon: metadata.icon,
          duration: 800,
        };

        setAnimations((prev) => [...prev, pickupAnimation]);
      }

      if (finalConfig.debugMode) {
        console.log(`PowerUp picked up: ${powerUp.type} (${powerUpId})`);
      }
    },
    [finalConfig.animationEnabled, finalConfig.debugMode],
  );

  const onPowerUpActivate = useCallback(
    (powerUpId: string) => {
      const powerUp = powerUpRegistry.current.get(powerUpId);
      if (!powerUp) return;

      const metadata = getPowerUpMetadata(powerUp.type);

      // Add to active power-ups
      const activePowerUp: ActivePowerUp = {
        id: powerUpId,
        type: powerUp.type,
        duration: powerUp.timeRemaining,
        maxDuration: powerUp.maxDuration,
        icon: metadata.icon,
        color: metadata.color,
        name: metadata.name,
      };

      setActivePowerUps((prev) => {
        // Remove any existing power-up with same ID and add new one
        const filtered = prev.filter((p) => p.id !== powerUpId);
        return [...filtered, activePowerUp];
      });

      if (finalConfig.animationEnabled) {
        const activateAnimation: PowerUpAnimationEvent = {
          id: generateAnimationId(),
          type: PowerUpAnimationType.Activate,
          powerUpType: powerUp.type,
          position: { x: window.innerWidth - 100, y: 100 }, // Top-right corner for UI feedback
          color: metadata.color,
          icon: metadata.icon,
          duration: 600,
        };

        setAnimations((prev) => [...prev, activateAnimation]);
      }

      if (finalConfig.debugMode) {
        console.log(
          `PowerUp activated: ${powerUp.type} (${powerUpId}) for ${powerUp.timeRemaining}ms`,
        );
      }
    },
    [finalConfig.animationEnabled, finalConfig.debugMode],
  );

  const onPowerUpExpire = useCallback(
    (powerUpId: string) => {
      const powerUp = powerUpRegistry.current.get(powerUpId);

      // Remove from active power-ups
      setActivePowerUps((prev) => prev.filter((p) => p.id !== powerUpId));

      if (powerUp && finalConfig.animationEnabled) {
        const metadata = getPowerUpMetadata(powerUp.type);
        const expireAnimation: PowerUpAnimationEvent = {
          id: generateAnimationId(),
          type: PowerUpAnimationType.Expire,
          powerUpType: powerUp.type,
          position: { x: window.innerWidth - 100, y: 100 }, // Same as activate for consistency
          color: metadata.color,
          icon: metadata.icon,
          duration: 500,
        };

        setAnimations((prev) => [...prev, expireAnimation]);
      }

      // Clean up registry
      powerUpRegistry.current.delete(powerUpId);

      if (finalConfig.debugMode) {
        console.log(
          `PowerUp expired: ${powerUp?.type || "unknown"} (${powerUpId})`,
        );
      }
    },
    [finalConfig.animationEnabled, finalConfig.debugMode],
  );

  // Animation management
  const clearAnimation = useCallback((animationId: string) => {
    setAnimations((prev) => prev.filter((anim) => anim.id !== animationId));
  }, []);

  const clearAllAnimations = useCallback(() => {
    setAnimations([]);
  }, []);

  return {
    // UI state
    activePowerUps,
    animations,

    // Game events
    onPowerUpSpawn,
    onPowerUpPickup,
    onPowerUpActivate,
    onPowerUpExpire,

    // Animation management
    clearAnimation,
    clearAllAnimations,

    // Debug utilities
    debugInfo,
  };
};
