/**
 * @file Particle.test.ts
 * Unit tests for Particle entity following TDD approach
 */
import { describe, it, expect } from "vitest";
import { Particle } from "./Particle";

describe("Particle Entity", () => {
  it("should create particle with provided configuration", () => {
    const particle = new Particle({
      position: { x: 100, y: 200 },
      velocity: { x: 5, y: -10 },
      lifespan: 1000,
      color: "#ff0000",
      size: 5,
    });

    expect(particle.position).toEqual({ x: 100, y: 200 });
    expect(particle.velocity).toEqual({ x: 5, y: -10 });
    expect(particle.color).toBe("#ff0000");
    expect(particle.size).toBe(5);
    expect(particle.lifespan).toBe(1000);
  });

  it("should have lifecycle management methods", () => {
    const particle = new Particle({
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      lifespan: 1000,
      color: "#ff0000",
      size: 5,
    });

    expect(particle.isAlive()).toBe(true);
    expect(particle.getLifePercentage()).toBe(1.0);
  });

  it("should have particle state tracking", () => {
    const particle = new Particle({
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      lifespan: 1000,
      color: "#ff0000",
      size: 5,
    });

    expect(particle.state).toBeDefined();
  });
});
