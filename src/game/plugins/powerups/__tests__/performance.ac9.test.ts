import { describe, it, expect, beforeEach } from "vitest";
import { MagnetPaddlePowerUp } from "../MagnetPaddlePowerUp";
import { MultiBallPowerUp } from "../MultiBallPowerUp";
import { PaddleSizePowerUp } from "../PaddleSizePowerUp";
import { BallSpeedPowerUp } from "../BallSpeedPowerUp";
import {
  createMockContext,
  createMockGameState,
  createMockBall,
} from "./test-utils";
import type { PowerUpPluginContext } from "../../../../types";
import type { GameState } from "../../../core/GameState";

/**
 * AC9 Performance Requirements Tests
 * - Target: 60 FPS (16.67ms per frame)
 * - Minimum: 55 FPS (18.18ms per frame)
 */
describe("AC9 Performance Requirements", () => {
  let context: PowerUpPluginContext;
  let gameState: GameState;

  beforeEach(() => {
    gameState = createMockGameState();
    context = createMockContext({ gameState });
  });

  describe("60 FPS Target Validation", () => {
    it("should maintain 60 FPS with MagnetPaddle + MultiBall (50 balls)", async () => {
      const magnetPowerUp = new MagnetPaddlePowerUp();
      const multiBallPowerUp = new MultiBallPowerUp();

      // Create 50 balls
      const balls = Array.from({ length: 50 }, (_, i) =>
        createMockBall(100 + (i % 10) * 60, 200 + Math.floor(i / 10) * 40)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      gameState.balls = balls;

      // Activate power-ups
      await magnetPowerUp.onActivate(context);
      (multiBallPowerUp as any).onApplyEffect(context);

      // Measure 60 frames
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();

        (magnetPowerUp as any).onUpdate(context, 16);
        (multiBallPowerUp as any).onUpdateEffect(context);

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      // Calculate metrics
      const avgFrameTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);

      // 60 FPS = 16.67ms per frame
      expect(avgFrameTime).toBeLessThan(16.67);
      expect(maxFrameTime).toBeLessThan(20); // Allow some variance
    });

    it("should maintain 60 FPS with all 4 power-ups active", async () => {
      const magnetPowerUp = new MagnetPaddlePowerUp();
      const multiBallPowerUp = new MultiBallPowerUp();
      const paddleSizePowerUp = new PaddleSizePowerUp();
      const ballSpeedPowerUp = new BallSpeedPowerUp();

      // Setup context
      const balls = Array.from({ length: 30 }, (_, i) =>
        createMockBall(100 + (i % 6) * 100, 200 + Math.floor(i / 6) * 60)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      context.gameEntities.paddle = context.entities?.paddle;
      gameState.balls = balls;

      // Activate all power-ups
      await magnetPowerUp.onActivate(context);
      (multiBallPowerUp as any).onApplyEffect(context);
      (paddleSizePowerUp as any).onApplyEffect(context);
      (ballSpeedPowerUp as any).onApplyEffect(context);

      // Measure performance over 120 frames (2 seconds)
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 120; frame++) {
        const frameStart = performance.now();

        (magnetPowerUp as any).onUpdate(context, 16);
        (multiBallPowerUp as any).onUpdateEffect(context);
        (paddleSizePowerUp as any).onUpdateEffect(context);
        (ballSpeedPowerUp as any).onUpdateEffect(context);

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const avgFrameTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const framesUnder16ms = frameTimes.filter((t) => t < 16.67).length;
      const fps60Percentage = (framesUnder16ms / frameTimes.length) * 100;

      // Should maintain 60 FPS for at least 95% of frames
      expect(avgFrameTime).toBeLessThan(16.67);
      expect(fps60Percentage).toBeGreaterThan(95);
    });
  });

  describe("55 FPS Minimum Requirement", () => {
    it("should never drop below 55 FPS under heavy load", async () => {
      const magnetPowerUp = new MagnetPaddlePowerUp();
      const multiBallPowerUp = new MultiBallPowerUp();
      const ballSpeedPowerUp = new BallSpeedPowerUp();

      // Stress test: 100 balls
      const balls = Array.from({ length: 100 }, (_, i) =>
        createMockBall(50 + (i % 20) * 35, 100 + Math.floor(i / 20) * 50)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      gameState.balls = balls;

      // Activate power-ups
      await magnetPowerUp.onActivate(context);
      (multiBallPowerUp as any).onApplyEffect(context);
      (ballSpeedPowerUp as any).onApplyEffect(context);

      // Measure worst-case frame times
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 100; frame++) {
        const frameStart = performance.now();

        (magnetPowerUp as any).onUpdate(context, 16);
        (multiBallPowerUp as any).onUpdateEffect(context);
        (ballSpeedPowerUp as any).onUpdateEffect(context);

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      const maxFrameTime = Math.max(...frameTimes);
      const worstFPS = 1000 / maxFrameTime;

      // 55 FPS = 18.18ms per frame maximum
      expect(maxFrameTime).toBeLessThan(18.18);
      expect(worstFPS).toBeGreaterThan(55);
    });

    it("should handle frame time consistency", async () => {
      const magnetPowerUp = new MagnetPaddlePowerUp();
      const paddleSizePowerUp = new PaddleSizePowerUp();

      const balls = Array.from({ length: 40 }, (_, i) =>
        createMockBall(100 + (i % 8) * 80, 150 + Math.floor(i / 8) * 70)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      context.gameEntities.paddle = context.entities?.paddle;
      gameState.balls = balls;

      await magnetPowerUp.onActivate(context);
      (paddleSizePowerUp as any).onApplyEffect(context);

      // Measure frame time variance
      const frameTimes: number[] = [];
      for (let frame = 0; frame < 120; frame++) {
        const frameStart = performance.now();

        (magnetPowerUp as any).onUpdate(context, 16);
        (paddleSizePowerUp as any).onUpdateEffect(context);

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      // Calculate variance
      const avgTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const variance =
        frameTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) /
        frameTimes.length;
      const stdDev = Math.sqrt(variance);

      // Standard deviation should be low (consistent performance)
      expect(stdDev).toBeLessThan(3);

      // 99% of frames should be under 55 FPS threshold (18.18ms)
      const framesUnder18ms = frameTimes.filter((t) => t < 18.18).length;
      const consistency = (framesUnder18ms / frameTimes.length) * 100;
      expect(consistency).toBeGreaterThan(99);
    });
  });

  describe("Memory and Resource Efficiency", () => {
    it("should not cause memory leaks during rapid activation/deactivation", async () => {
      const magnetPowerUp = new MagnetPaddlePowerUp();
      const multiBallPowerUp = new MultiBallPowerUp();

      const balls = Array.from({ length: 20 }, (_, i) =>
        createMockBall(200 + i * 30, 300)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      gameState.balls = balls;

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Rapidly activate/deactivate 50 times
      for (let i = 0; i < 50; i++) {
        await magnetPowerUp.onActivate(context);
        (multiBallPowerUp as any).onApplyEffect(context);

        await magnetPowerUp.onDeactivate(context);
        (multiBallPowerUp as any).onRemoveEffect(context);
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 500KB)
      if (initialMemory > 0) {
        expect(memoryIncrease).toBeLessThan(500 * 1024);
      }
    });

    it("should handle rapid sequential updates efficiently", async () => {
      const powerUps = [
        new MagnetPaddlePowerUp(),
        new MultiBallPowerUp(),
        new PaddleSizePowerUp(),
        new BallSpeedPowerUp(),
      ];

      const balls = Array.from({ length: 50 }, (_, i) =>
        createMockBall(100 + (i % 10) * 60, 200 + Math.floor(i / 10) * 50)
      );
      context.gameEntities = context.gameEntities || {};
      context.gameEntities.balls = balls;
      context.gameEntities.paddle = context.entities?.paddle;
      gameState.balls = balls;

      // Activate all
      await powerUps[0].onActivate(context);
      (powerUps[1] as any).onApplyEffect(context);
      (powerUps[2] as any).onApplyEffect(context);
      (powerUps[3] as any).onApplyEffect(context);

      // Measure 1000 consecutive update cycles
      const startTime = performance.now();
      for (let cycle = 0; cycle < 1000; cycle++) {
        (powerUps[0] as any).onUpdate(context, 16);
        (powerUps[1] as any).onUpdateEffect(context);
        (powerUps[2] as any).onUpdateEffect(context);
        (powerUps[3] as any).onUpdateEffect(context);
      }
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const avgCycleTime = totalTime / 1000;

      // Average cycle should be well under 16.67ms
      expect(avgCycleTime).toBeLessThan(10);
    });
  });
});
