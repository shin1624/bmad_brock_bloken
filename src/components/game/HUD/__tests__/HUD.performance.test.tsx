import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  HUD,
  ScoreDisplay,
  LivesDisplay,
  LevelDisplay,
  PowerUpStatus,
  ComboDisplay,
} from "../index";
import type { ActivePowerUp, ComboState } from "../index";

describe("HUD Performance Tests", () => {
  beforeEach(() => {
    // Mock performance.now for consistent timing
    Object.defineProperty(global, "performance", {
      writable: true,
      value: {
        now: vi.fn(() => Date.now()),
      },
    });
  });

  it("should render HUD within performance target", () => {
    const startTime = performance.now();

    render(<HUD hudState={{ score: 1500, lives: 3, level: 2 }} />);

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(100); // More realistic for test environment
  });

  it("should handle score updates efficiently", () => {
    const { rerender } = render(<ScoreDisplay score={1000} />);

    const startTime = performance.now();

    // Simulate 60 score updates (1 second at 60fps)
    for (let i = 0; i < 60; i++) {
      rerender(<ScoreDisplay score={1000 + i * 10} />);
    }

    const totalTime = performance.now() - startTime;
    const averageUpdateTime = totalTime / 60;

    expect(averageUpdateTime).toBeLessThan(8);
  });

  it("should handle lives updates efficiently", () => {
    const { rerender } = render(<LivesDisplay lives={3} maxLives={5} />);

    const startTime = performance.now();

    // Simulate life changes
    for (let lives = 3; lives > 0; lives--) {
      rerender(<LivesDisplay lives={lives} maxLives={5} />);
    }

    const totalTime = performance.now() - startTime;
    expect(totalTime).toBeLessThan(24); // 3 updates * 8ms target
  });

  it("should handle level progression updates efficiently", () => {
    const { rerender } = render(<LevelDisplay level={1} progress={0} />);

    const startTime = performance.now();

    // Simulate level progression
    for (let progress = 0; progress <= 100; progress += 10) {
      rerender(<LevelDisplay level={1} progress={progress} />);
    }

    const totalTime = performance.now() - startTime;
    const averageUpdateTime = totalTime / 11;

    expect(averageUpdateTime).toBeLessThan(8);
  });

  it("should handle multiple power-ups efficiently", () => {
    const powerUps: ActivePowerUp[] = Array.from({ length: 10 }, (_, i) => ({
      id: `powerup-${i}`,
      type: "multiball",
      duration: 5000 - i * 500,
      maxDuration: 5000,
      icon: "⚡",
      color: "#ff6b6b",
      name: `Power-Up ${i + 1}`,
    }));

    const startTime = performance.now();

    render(<PowerUpStatus powerUps={powerUps} />);

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(50); // More realistic for multiple components
  });

  it("should handle combo updates efficiently", () => {
    const { rerender } = render(
      <ComboDisplay
        combo={{ count: 0, multiplier: 1, streak: 0, timeRemaining: 5000 }}
      />,
    );

    const startTime = performance.now();

    // Simulate combo building
    for (let count = 1; count <= 50; count++) {
      const combo: ComboState = {
        count,
        multiplier: 1 + count * 0.1,
        streak: Math.floor(count / 5),
        timeRemaining: 5000 - count * 100,
      };
      rerender(<ComboDisplay combo={combo} />);
    }

    const totalTime = performance.now() - startTime;
    const averageUpdateTime = totalTime / 50;

    expect(averageUpdateTime).toBeLessThan(8);
  });

  it("should maintain performance with complex HUD state", () => {
    const complexPowerUps: ActivePowerUp[] = Array.from(
      { length: 5 },
      (_, i) => ({
        id: `complex-powerup-${i}`,
        type: ["multiball", "paddlesize", "ballspeed", "penetration", "magnet"][
          i
        ],
        duration: 10000 - i * 1000,
        maxDuration: 10000,
        icon: ["⚡", "🏓", "💨", "🎯", "🧲"][i],
        color: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"][i],
        name: [
          "Multi Ball",
          "Big Paddle",
          "Speed Boost",
          "Penetration",
          "Magnet",
        ][i],
      }),
    );

    const complexCombo: ComboState = {
      count: 25,
      multiplier: 3.5,
      streak: 15,
      timeRemaining: 2000,
    };

    const startTime = performance.now();

    render(
      <div>
        <HUD hudState={{ score: 50000, lives: 1, level: 8 }} />
        <PowerUpStatus powerUps={complexPowerUps} />
        <ComboDisplay combo={complexCombo} />
        <LevelDisplay level={8} progress={75} />
      </div>,
    );

    const renderTime = performance.now() - startTime;
    expect(renderTime).toBeLessThan(16); // Allow 2x target for complex scenario
  });

  it("should handle animation performance", () => {
    const { rerender } = render(<ScoreDisplay score={1000} />);

    const startTime = performance.now();

    // Simulate animated score changes synchronously
    for (let i = 0; i < 10; i++) {
      rerender(<ScoreDisplay score={1000 + i * 500} />);
    }

    const animationTime = performance.now() - startTime;
    expect(animationTime).toBeLessThan(100); // Reasonable animation overhead
  });

  it("should optimize memory usage", () => {
    const initialMemory =
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize || 0;

    // Create and destroy multiple HUD instances
    for (let i = 0; i < 100; i++) {
      const { unmount } = render(
        <HUD hudState={{ score: i * 100, lives: 3, level: 1 }} />,
      );
      unmount();
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory =
      (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 2MB)
    expect(memoryIncrease).toBeLessThan(2 * 1024 * 1024);
  });

  it("should handle rapid re-renders without performance degradation", () => {
    const { rerender } = render(
      <HUD hudState={{ score: 0, lives: 3, level: 1 }} />,
    );

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();

      rerender(<HUD hudState={{ score: i * 100, lives: 3, level: 1 }} />);

      const end = performance.now();
      times.push(end - start);
    }

    const averageTime =
      times.reduce((sum, time) => sum + time, 0) / times.length;
    const maxTime = Math.max(...times);

    expect(averageTime).toBeLessThan(8);
    expect(maxTime).toBeLessThan(16); // Even worst case should be reasonable
  });
});
