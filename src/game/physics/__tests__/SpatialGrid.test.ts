/**
 * SpatialGrid Tests for Story 2.4 - Performance Optimization
 */
import { describe, it, expect } from "vitest";
import { SpatialGrid } from "../SpatialGrid";
import { Rectangle } from "../../../types/game.types";

describe("SpatialGrid - Story 2.4 Performance Optimization", () => {
  describe("AC7: 性能最適化（空間分割）", () => {
    describe("2.4-UNIT-017: 空間分割グリッドアルゴリズム", () => {
      it("should divide space into grid cells", () => {
        const grid = new SpatialGrid(800, 600, 64); // 800x600 with 64px cells

        expect(grid.getCellCount()).toBe(13 * 10); // 13x10 = 130 cells
      });

      it("should efficiently query objects in specific regions", () => {
        const grid = new SpatialGrid(400, 400, 100); // 4x4 grid

        const rect1: Rectangle = { x: 50, y: 50, width: 20, height: 20 };
        const rect2: Rectangle = { x: 250, y: 250, width: 20, height: 20 };

        grid.insert("rect1", rect1);
        grid.insert("rect2", rect2);

        const queryRegion: Rectangle = { x: 0, y: 0, width: 150, height: 150 };
        const results = grid.query(queryRegion);

        expect(results).toContain("rect1");
        expect(results).not.toContain("rect2");
      });
    });
  });
});
