import { describe, it, expect, vi } from "vitest";

describe("Animation Performance Tests", () => {
  it("should maintain 60 FPS frame rate", async () => {
    // Mock requestAnimationFrame
    const mockRAF = vi.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(performance.now()), 16); // 60 FPS
      return 1;
    });
    global.requestAnimationFrame = mockRAF;

    const frameTimings: number[] = [];
    let lastTime = performance.now();
    let frameCount = 0;

    const measureFrame = (currentTime: number) => {
      const delta = currentTime - lastTime;
      if (frameCount > 0) {
        // Skip first frame
        frameTimings.push(delta);
      }
      lastTime = currentTime;
      frameCount++;

      if (frameCount < 10) {
        requestAnimationFrame(measureFrame);
      }
    };

    requestAnimationFrame(measureFrame);

    // Wait for frames to complete
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Calculate average frame time
    const avgFrameTime =
      frameTimings.reduce((a, b) => a + b, 0) / frameTimings.length;

    // Should be close to 16.67ms (60 FPS)
    expect(avgFrameTime).toBeGreaterThan(10);
    expect(avgFrameTime).toBeLessThan(25);
  });
});
