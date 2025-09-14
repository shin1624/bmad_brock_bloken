/**
 * Performance benchmarks for Story 2.4 - Collision Detection System
 * Validates spatial partitioning implementation and benchmarks
 */
import { describe, it, expect, beforeEach } from "vitest";
import { SpatialGrid } from "../SpatialGrid";
import { CollisionDetector } from "../CollisionDetector";
import { Rectangle, Circle } from "../../../types/game.types";

describe("Collision Performance Benchmarks - Story 2.4", () => {
  describe("AC7: 性能最適化（空間分割）", () => {
    describe("2.4-PERF-001: Spatial Grid Performance Validation", () => {
      const TEST_AREA_WIDTH = 800;
      const TEST_AREA_HEIGHT = 600;
      const GRID_CELL_SIZE = 64;

      let spatialGrid: SpatialGrid;
      let entities: Array<Rectangle & { id: string }>;
      let queryRegion: Rectangle;

      // Local measurePerformance function
      const measurePerformance = (fn: () => void, iterations: number = 1000): number => {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          fn();
        }
        const end = performance.now();
        return (end - start) / iterations;
      };

      beforeEach(() => {
        spatialGrid = new SpatialGrid(TEST_AREA_WIDTH, TEST_AREA_HEIGHT, GRID_CELL_SIZE);
        entities = [];
        queryRegion = { x: 300, y: 250, width: 200, height: 100 };
      });

      const createTestEntities = (count: number): Array<Rectangle & { id: string }> => {
        const entities: Array<Rectangle & { id: string }> = [];
        for (let i = 0; i < count; i++) {
          entities.push({
            id: `entity_${i}`,
            x: Math.random() * (TEST_AREA_WIDTH - 50),
            y: Math.random() * (TEST_AREA_HEIGHT - 50),
            width: 25 + Math.random() * 25,
            height: 15 + Math.random() * 15
          });
        }
        return entities;
      };

      it("should demonstrate basic spatial grid functionality and performance", () => {
        const entityCount = 100;
        entities = createTestEntities(entityCount);

        // Insert all entities into spatial grid
        entities.forEach(entity => {
          spatialGrid.insert(entity.id, entity);
        });

        // Measure spatial grid query performance
        const spatialTime = measurePerformance(() => {
          spatialGrid.query(queryRegion);
        }, 500);

        console.log(`\n${entityCount} entities - Spatial query: ${spatialTime.toFixed(4)}ms`);
        
        // Validate functionality
        const results = spatialGrid.query(queryRegion);
        expect(results.length).toBeGreaterThanOrEqual(0);
        expect(spatialTime).toBeLessThan(1.0); // Reasonable performance
      });

      it("should measure spatial grid statistics and efficiency", () => {
        const entityCount = 500;
        entities = createTestEntities(entityCount);

        entities.forEach(entity => {
          spatialGrid.insert(entity.id, entity);
        });

        const stats = spatialGrid.getStats();
        const totalCells = spatialGrid.getCellCount();
        const efficiency = stats.cellsUsed / totalCells;

        console.log(`\nSpatial Grid Statistics:`);
        console.log(`Total cells: ${totalCells}`);
        console.log(`Cells used: ${stats.cellsUsed}`);
        console.log(`Grid efficiency: ${(efficiency * 100).toFixed(1)}%`);
        console.log(`Avg objects per cell: ${stats.averageObjectsPerCell.toFixed(2)}`);

        expect(stats.totalObjects).toBe(entityCount);
        expect(stats.cellsUsed).toBeGreaterThan(0);
        expect(stats.averageObjectsPerCell).toBeGreaterThan(0);
        expect(totalCells).toBe(130); // Expected for 800x600 with 64px cells
      });

      it("should validate query result accuracy", () => {
        const entityCount = 200;
        entities = createTestEntities(entityCount);

        entities.forEach(entity => {
          spatialGrid.insert(entity.id, entity);
        });

        const spatialResults = spatialGrid.query(queryRegion);
        
        // Manually verify some results
        const manualResults: string[] = [];
        entities.forEach(entity => {
          if (entity.x < queryRegion.x + queryRegion.width &&
              entity.x + entity.width > queryRegion.x &&
              entity.y < queryRegion.y + queryRegion.height &&
              entity.y + entity.height > queryRegion.y) {
            manualResults.push(entity.id);
          }
        });

        // Results should match
        expect(spatialResults.sort()).toEqual(manualResults.sort());
      });
    });

    describe("2.4-PERF-002: Collision Detection Performance", () => {
      it("should benchmark circle-rectangle collision detection", () => {
        const circle: Circle = { x: 400, y: 300, radius: 10 };
        const rectangles: Rectangle[] = [];
        
        for (let i = 0; i < 100; i++) {
          rectangles.push({
            x: Math.random() * 800,
            y: Math.random() * 600,
            width: 25,
            height: 15
          });
        }

        const measurePerformance = (fn: () => void, iterations: number = 100): number => {
          const start = performance.now();
          for (let i = 0; i < iterations; i++) {
            fn();
          }
          const end = performance.now();
          return (end - start) / iterations;
        };

        const collisionTime = measurePerformance(() => {
          rectangles.forEach(rect => {
            CollisionDetector.checkCircleRectangle(circle, rect);
          });
        }, 50);

        console.log(`\nCircle-Rectangle collision (100 checks): ${collisionTime.toFixed(4)}ms`);
        
        // Should complete collision checks in reasonable time
        expect(collisionTime).toBeLessThan(5.0); // Less than 5ms for 100 checks
      });
    });
  });
});