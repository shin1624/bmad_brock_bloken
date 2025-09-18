/**
 * Game State Integration Hook Tests
 * Story 4.1, Task 5: Integration tests for React-Canvas bridge
 * Tests synchronization between game state and React UI components
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGameStateIntegration } from "../useGameStateIntegration";
import { PowerUpType } from "../../components/game/HUD/PowerUpStatus";
import { PowerUpAnimationType } from "../../components/game/animations/PowerUpAnimations";

// Mock performance.now for consistent testing
const mockPerformanceNow = vi.fn();
Object.defineProperty(window, "performance", {
  value: { now: mockPerformanceNow },
  writable: true,
});

describe("useGameStateIntegration Hook", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPerformanceNow.mockReturnValue(0);

    // Mock window dimensions
    Object.defineProperty(window, "innerWidth", { value: 800, writable: true });
    Object.defineProperty(window, "innerHeight", {
      value: 600,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Hook Initialization", () => {
    it("should initialize with empty state", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      expect(result.current.activePowerUps).toEqual([]);
      expect(result.current.animations).toEqual([]);
      expect(result.current.debugInfo.powerUpCount).toBe(0);
      expect(result.current.debugInfo.animationCount).toBe(0);
    });

    it("should initialize with custom config", () => {
      const config = {
        updateInterval: 100,
        animationEnabled: false,
        debugMode: true,
      };

      const { result } = renderHook(() => useGameStateIntegration(config));

      expect(result.current).toBeDefined();
      expect(result.current.activePowerUps).toEqual([]);
    });
  });

  describe("PowerUp Spawn Events", () => {
    it("should handle power-up spawn and create animation", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
      });

      expect(result.current.animations).toHaveLength(1);
      expect(result.current.animations[0].type).toBe(
        PowerUpAnimationType.Spawn,
      );
      expect(result.current.animations[0].powerUpType).toBe(
        PowerUpType.MultiBall,
      );
      expect(result.current.animations[0].position).toEqual({ x: 100, y: 200 });
    });

    it("should not create animation when disabled", () => {
      const { result } = renderHook(() =>
        useGameStateIntegration({ animationEnabled: false }),
      );

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
      });

      expect(result.current.animations).toHaveLength(0);
    });
  });

  describe("PowerUp Pickup Events", () => {
    it("should handle power-up pickup and create pickup animation", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // First spawn the power-up
      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.PaddleSize,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 20000,
        maxDuration: 20000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
      });

      // Then pick it up
      act(() => {
        result.current.onPowerUpPickup("powerup-1", { x: 150, y: 250 });
      });

      expect(result.current.animations).toHaveLength(2); // spawn + pickup
      const pickupAnimation = result.current.animations.find(
        (anim) => anim.type === PowerUpAnimationType.Pickup,
      );

      expect(pickupAnimation).toBeDefined();
      expect(pickupAnimation!.position).toEqual({ x: 150, y: 250 });
    });

    it("should handle pickup of non-existent power-up gracefully", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      act(() => {
        result.current.onPowerUpPickup("non-existent", { x: 100, y: 200 });
      });

      expect(result.current.animations).toHaveLength(0);
    });
  });

  describe("PowerUp Activation Events", () => {
    it("should activate power-up and add to active list", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // Spawn power-up first
      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.BallSpeed,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 15000,
        maxDuration: 15000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      expect(result.current.activePowerUps).toHaveLength(1);

      const activePowerUp = result.current.activePowerUps[0];
      expect(activePowerUp.id).toBe("powerup-1");
      expect(activePowerUp.type).toBe(PowerUpType.BallSpeed);
      expect(activePowerUp.duration).toBe(15000);
      expect(activePowerUp.name).toBe("Ball Speed");

      // Should also create activation animation
      const activateAnimation = result.current.animations.find(
        (anim) => anim.type === PowerUpAnimationType.Activate,
      );
      expect(activateAnimation).toBeDefined();
    });

    it("should replace existing power-up with same ID", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");

        // Activate again with different duration
        mockPowerUp.timeRemaining = 5000;
        result.current.onPowerUpActivate("powerup-1");
      });

      expect(result.current.activePowerUps).toHaveLength(1);
      expect(result.current.activePowerUps[0].duration).toBe(5000);
    });
  });

  describe("PowerUp Expiration Events", () => {
    it("should handle power-up expiration and remove from active list", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // Activate power-up
      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.Penetration,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      expect(result.current.activePowerUps).toHaveLength(1);

      // Expire the power-up
      act(() => {
        result.current.onPowerUpExpire("powerup-1");
      });

      expect(result.current.activePowerUps).toHaveLength(0);

      // Should create expiration animation
      const expireAnimation = result.current.animations.find(
        (anim) => anim.type === PowerUpAnimationType.Expire,
      );
      expect(expireAnimation).toBeDefined();
    });
  });

  describe("Duration Updates", () => {
    it("should update power-up durations over time", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.Magnet,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 5000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      const initialDuration = result.current.activePowerUps[0].duration;

      // Advance time
      act(() => {
        vi.advanceTimersByTime(1000); // 1 second
      });

      const updatedDuration = result.current.activePowerUps[0].duration;
      expect(updatedDuration).toBeLessThan(initialDuration);
      expect(updatedDuration).toBeCloseTo(initialDuration - 1000, -2);
    });

    it("should automatically remove expired power-ups", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 1000, // 1 second
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      expect(result.current.activePowerUps).toHaveLength(1);

      // Advance time past expiration
      act(() => {
        vi.advanceTimersByTime(2000); // 2 seconds
      });

      expect(result.current.activePowerUps).toHaveLength(0);
    });
  });

  describe("Animation Management", () => {
    it("should clear individual animations", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
      });

      const animationId = result.current.animations[0].id;

      act(() => {
        result.current.clearAnimation(animationId);
      });

      expect(result.current.animations).toHaveLength(0);
    });

    it("should clear all animations", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // Create multiple animations
      const mockPowerUp1 = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      const mockPowerUp2 = {
        id: "powerup-2",
        type: PowerUpType.BallSpeed,
        position: { x: 200, y: 300 },
        active: true,
        collected: false,
        timeRemaining: 15000,
        maxDuration: 15000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp1);
        result.current.onPowerUpSpawn(mockPowerUp2);
      });

      expect(result.current.animations).toHaveLength(2);

      act(() => {
        result.current.clearAllAnimations();
      });

      expect(result.current.animations).toHaveLength(0);
    });
  });

  describe("Debug Information", () => {
    it("should provide debug information", () => {
      const { result } = renderHook(() =>
        useGameStateIntegration({ debugMode: true }),
      );

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 10000,
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      // Wait for debug info to update (triggered every 20 cycles * 50ms = 1 second)
      act(() => {
        vi.advanceTimersByTime(1000); // Trigger debug update
      });

      expect(result.current.debugInfo.powerUpCount).toBe(1);
      expect(result.current.debugInfo.animationCount).toBeGreaterThan(0);
    });

    it("should update debug info periodically", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // Advance time to trigger debug update
      act(() => {
        vi.advanceTimersByTime(1000); // 1 second (20 updates at 50ms interval)
      });

      expect(result.current.debugInfo.updateRate).toBeGreaterThan(0);
    });
  });

  describe("Performance and Memory Management", () => {
    it("should handle large numbers of power-ups efficiently", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      const startTime = performance.now();

      // Create many power-ups
      act(() => {
        for (let i = 0; i < 100; i++) {
          const mockPowerUp = {
            id: `powerup-${i}`,
            type: PowerUpType.MultiBall,
            position: { x: i * 10, y: i * 10 },
            active: true,
            collected: false,
            timeRemaining: 10000,
            maxDuration: 10000,
          };
          result.current.onPowerUpSpawn(mockPowerUp);
          result.current.onPowerUpActivate(`powerup-${i}`);
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.current.activePowerUps).toHaveLength(100);
      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it("should clean up expired power-ups from registry", () => {
      const { result } = renderHook(() =>
        useGameStateIntegration({ debugMode: true }),
      );

      const mockPowerUp = {
        id: "powerup-1",
        type: PowerUpType.MultiBall,
        position: { x: 100, y: 200 },
        active: true,
        collected: false,
        timeRemaining: 500, // Short duration
        maxDuration: 10000,
      };

      act(() => {
        result.current.onPowerUpSpawn(mockPowerUp);
        result.current.onPowerUpActivate("powerup-1");
      });

      // Verify power-up is active before waiting for debug update
      expect(result.current.activePowerUps).toHaveLength(1);
      expect(result.current.activePowerUps[0].id).toBe("powerup-1");

      // Wait for initial debug info update (debug updates every 20 cycles = 1000ms)
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(result.current.debugInfo.powerUpCount).toBe(1);

      // Wait for expiration (500ms + buffer) and trigger another debug update cycle
      act(() => {
        vi.advanceTimersByTime(1500); // Wait 1.5 seconds to ensure expiration and debug update
      });

      // Verify power-up is expired from active list
      expect(result.current.activePowerUps).toHaveLength(0);
      expect(result.current.debugInfo.powerUpCount).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing power-up metadata gracefully", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      // Try to pickup a power-up that was never spawned
      act(() => {
        result.current.onPowerUpPickup("non-existent", { x: 100, y: 200 });
      });

      // Should not crash
      expect(result.current.animations).toHaveLength(0);
    });

    it("should handle activation of non-existent power-up", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      act(() => {
        result.current.onPowerUpActivate("non-existent");
      });

      expect(result.current.activePowerUps).toHaveLength(0);
    });

    it("should handle expiration of non-existent power-up", () => {
      const { result } = renderHook(() => useGameStateIntegration());

      act(() => {
        result.current.onPowerUpExpire("non-existent");
      });

      // Should not crash
      expect(result.current.activePowerUps).toHaveLength(0);
    });
  });
});
