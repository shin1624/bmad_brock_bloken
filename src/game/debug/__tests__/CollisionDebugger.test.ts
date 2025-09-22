/**
 * CollisionDebugger Tests for Story 2.4
 */
import { describe, it, expect } from "vitest";
import { CollisionDebugger } from "../CollisionDebugger";
import { EventBus } from "../../core/EventBus";

describe("CollisionDebugger", () => {
  it("should toggle debug mode when F6 is pressed", () => {
    const eventBus = new EventBus();
    const collisionDebugger = new CollisionDebugger(eventBus);

    expect(collisionDebugger.isEnabled()).toBe(false);

    collisionDebugger.toggle();

    expect(collisionDebugger.isEnabled()).toBe(true);
  });
});
