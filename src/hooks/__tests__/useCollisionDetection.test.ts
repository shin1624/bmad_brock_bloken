/**
 * useCollisionDetection Hook Tests for Story 2.4
 */
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCollisionDetection } from "../useCollisionDetection";

describe("useCollisionDetection - Story 2.4 React Integration", () => {
  describe("AC8: React統合フック", () => {
    describe("2.4-UNIT-020: useCollisionDetection基本機能", () => {
      it("should provide collision detection methods", () => {
        const { result } = renderHook(() => useCollisionDetection());

        expect(result.current.checkAABB).toBeDefined();
        expect(typeof result.current.checkAABB).toBe("function");
      });
    });
  });
});
