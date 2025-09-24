import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialGrid } from '../SpatialGrid';
import type { Entity } from '../../entities/Entity';

describe('SpatialGrid', () => {
  let spatialGrid: SpatialGrid;
  
  const createEntity = (id: string, x: number, y: number, width: number, height: number): Entity => ({
    id,
    x,
    y,
    width,
    height,
    getBounds: () => ({ x, y, width, height })
  });

  beforeEach(() => {
    spatialGrid = new SpatialGrid(800, 600, 50); // 800x600 with 50px cells
  });

  describe('Grid Initialization', () => {
    it('should create correct number of cells', () => {
      const cols = Math.ceil(800 / 50);
      const rows = Math.ceil(600 / 50);
      expect(spatialGrid.getCellCount()).toBe(cols * rows);
    });

    it('should handle non-divisible dimensions', () => {
      const grid = new SpatialGrid(810, 610, 50);
      expect(grid.getCols()).toBe(17); // ceil(810/50)
      expect(grid.getRows()).toBe(13); // ceil(610/50)
    });

    it('should initialize empty cells', () => {
      expect(spatialGrid.getEntityCount()).toBe(0);
    });
  });

  describe('Entity Insertion', () => {
    it('should insert entity into correct cell', () => {
      const entity = createEntity('1', 25, 25, 10, 10);
      spatialGrid.insert(entity);
      
      const cell = spatialGrid.getCellAtPosition(25, 25);
      expect(cell.entities).toContain(entity);
    });

    it('should insert entity spanning multiple cells', () => {
      const entity = createEntity('1', 45, 45, 20, 20); // Spans 4 cells
      spatialGrid.insert(entity);
      
      expect(spatialGrid.getCellAtPosition(45, 45).entities).toContain(entity);
      expect(spatialGrid.getCellAtPosition(55, 45).entities).toContain(entity);
      expect(spatialGrid.getCellAtPosition(45, 55).entities).toContain(entity);
      expect(spatialGrid.getCellAtPosition(55, 55).entities).toContain(entity);
    });

    it('should handle entities at grid boundaries', () => {
      const entity = createEntity('1', 795, 595, 10, 10);
      spatialGrid.insert(entity);
      
      const cell = spatialGrid.getCellAtPosition(795, 595);
      expect(cell.entities).toContain(entity);
    });

    it('should clip entities outside grid bounds', () => {
      const entity = createEntity('1', -10, -10, 20, 20);
      spatialGrid.insert(entity);
      
      const cell = spatialGrid.getCellAtPosition(0, 0);
      expect(cell.entities).toContain(entity);
    });
  });

  describe('Entity Removal', () => {
    it('should remove entity from grid', () => {
      const entity = createEntity('1', 25, 25, 10, 10);
      spatialGrid.insert(entity);
      spatialGrid.remove(entity);
      
      const cell = spatialGrid.getCellAtPosition(25, 25);
      expect(cell.entities).not.toContain(entity);
    });

    it('should remove entity from all cells it spans', () => {
      const entity = createEntity('1', 45, 45, 20, 20);
      spatialGrid.insert(entity);
      spatialGrid.remove(entity);
      
      expect(spatialGrid.getCellAtPosition(45, 45).entities).not.toContain(entity);
      expect(spatialGrid.getCellAtPosition(55, 45).entities).not.toContain(entity);
      expect(spatialGrid.getCellAtPosition(45, 55).entities).not.toContain(entity);
      expect(spatialGrid.getCellAtPosition(55, 55).entities).not.toContain(entity);
    });
  });

  describe('Entity Updates', () => {
    it('should update entity position', () => {
      const entity = createEntity('1', 25, 25, 10, 10);
      spatialGrid.insert(entity);
      
      // Move entity
      entity.x = 75;
      entity.y = 75;
      spatialGrid.update(entity);
      
      expect(spatialGrid.getCellAtPosition(25, 25).entities).not.toContain(entity);
      expect(spatialGrid.getCellAtPosition(75, 75).entities).toContain(entity);
    });

    it('should handle size changes', () => {
      const entity = createEntity('1', 25, 25, 10, 10);
      spatialGrid.insert(entity);
      
      // Increase size to span multiple cells
      entity.width = 30;
      entity.height = 30;
      spatialGrid.update(entity);
      
      expect(spatialGrid.getCellAtPosition(25, 25).entities).toContain(entity);
      expect(spatialGrid.getCellAtPosition(50, 50).entities).toContain(entity);
    });
  });

  describe('Neighbor Queries', () => {
    it('should find entities in same cell', () => {
      const entity1 = createEntity('1', 10, 10, 5, 5);
      const entity2 = createEntity('2', 20, 20, 5, 5);
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      
      const neighbors = spatialGrid.getNearbyEntities(entity1);
      expect(neighbors).toContain(entity2);
    });

    it('should find entities in adjacent cells', () => {
      const entity1 = createEntity('1', 45, 45, 5, 5);
      const entity2 = createEntity('2', 55, 45, 5, 5); // Next cell
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      
      const neighbors = spatialGrid.getNearbyEntities(entity1, true); // Include adjacent
      expect(neighbors).toContain(entity2);
    });

    it('should query region for entities', () => {
      const entity1 = createEntity('1', 10, 10, 5, 5);
      const entity2 = createEntity('2', 60, 60, 5, 5);
      const entity3 = createEntity('3', 200, 200, 5, 5);
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      spatialGrid.insert(entity3);
      
      const region = spatialGrid.queryRegion(0, 0, 100, 100);
      expect(region).toContain(entity1);
      expect(region).toContain(entity2);
      expect(region).not.toContain(entity3);
    });

    it('should handle circular region queries', () => {
      const entity1 = createEntity('1', 50, 50, 5, 5);
      const entity2 = createEntity('2', 60, 50, 5, 5);
      const entity3 = createEntity('3', 100, 50, 5, 5);
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      spatialGrid.insert(entity3);
      
      const radius = 20;
      const inRadius = spatialGrid.queryRadius(50, 50, radius);
      
      expect(inRadius).toContain(entity1);
      expect(inRadius).toContain(entity2);
      expect(inRadius).not.toContain(entity3);
    });
  });

  describe('Collision Pairs', () => {
    it('should generate unique collision pairs', () => {
      const entity1 = createEntity('1', 10, 10, 20, 20);
      const entity2 = createEntity('2', 20, 20, 20, 20);
      const entity3 = createEntity('3', 25, 25, 20, 20);
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      spatialGrid.insert(entity3);
      
      const pairs = spatialGrid.getCollisionPairs();
      
      // Should have 3 unique pairs
      expect(pairs).toHaveLength(3);
      
      // No duplicate pairs
      const pairStrings = pairs.map(p => `${p[0].id}-${p[1].id}`);
      const uniquePairs = new Set(pairStrings);
      expect(uniquePairs.size).toBe(pairs.length);
    });

    it('should not pair entity with itself', () => {
      const entity = createEntity('1', 10, 10, 20, 20);
      spatialGrid.insert(entity);
      
      const pairs = spatialGrid.getCollisionPairs();
      expect(pairs).toHaveLength(0);
    });

    it('should only pair overlapping bounds', () => {
      const entity1 = createEntity('1', 0, 0, 10, 10);
      const entity2 = createEntity('2', 20, 0, 10, 10); // No overlap
      const entity3 = createEntity('3', 5, 5, 10, 10); // Overlaps entity1
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      spatialGrid.insert(entity3);
      
      const pairs = spatialGrid.getCollisionPairs();
      
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toContain(entity1);
      expect(pairs[0]).toContain(entity3);
    });
  });

  describe('Grid Optimization', () => {
    it('should clear grid efficiently', () => {
      // Insert many entities
      for (let i = 0; i < 100; i++) {
        const entity = createEntity(`${i}`, i * 5, i * 5, 10, 10);
        spatialGrid.insert(entity);
      }
      
      expect(spatialGrid.getEntityCount()).toBe(100);
      
      spatialGrid.clear();
      expect(spatialGrid.getEntityCount()).toBe(0);
      
      // All cells should be empty
      for (let x = 0; x < 800; x += 50) {
        for (let y = 0; y < 600; y += 50) {
          expect(spatialGrid.getCellAtPosition(x, y).entities).toHaveLength(0);
        }
      }
    });

    it('should rebuild grid with new cell size', () => {
      const entity1 = createEntity('1', 25, 25, 10, 10);
      const entity2 = createEntity('2', 125, 125, 10, 10);
      
      spatialGrid.insert(entity1);
      spatialGrid.insert(entity2);
      
      // Rebuild with larger cells
      spatialGrid.rebuild(100);
      
      // Both should be in same cell now
      const neighbors = spatialGrid.getNearbyEntities(entity1);
      expect(neighbors).toContain(entity2);
    });

    it('should handle dynamic cell sizing', () => {
      // Start with small cells
      spatialGrid = new SpatialGrid(800, 600, 25);
      
      // Insert many small entities
      for (let i = 0; i < 50; i++) {
        const entity = createEntity(`small-${i}`, i * 10, i * 10, 5, 5);
        spatialGrid.insert(entity);
      }
      
      // Check if cell size should be adjusted
      const optimalSize = spatialGrid.calculateOptimalCellSize();
      expect(optimalSize).toBeLessThanOrEqual(25);
      
      // Clear and insert few large entities
      spatialGrid.clear();
      for (let i = 0; i < 5; i++) {
        const entity = createEntity(`large-${i}`, i * 100, i * 100, 80, 80);
        spatialGrid.insert(entity);
      }
      
      const newOptimalSize = spatialGrid.calculateOptimalCellSize();
      expect(newOptimalSize).toBeGreaterThan(25);
    });
  });

  describe('Performance', () => {
    it('should handle large number of entities', () => {
      const startTime = performance.now();
      
      // Insert 1000 entities
      for (let i = 0; i < 1000; i++) {
        const entity = createEntity(
          `${i}`,
          Math.random() * 800,
          Math.random() * 600,
          10 + Math.random() * 20,
          10 + Math.random() * 20
        );
        spatialGrid.insert(entity);
      }
      
      const insertTime = performance.now() - startTime;
      expect(insertTime).toBeLessThan(50); // Should be fast
      
      // Query performance
      const queryStart = performance.now();
      const pairs = spatialGrid.getCollisionPairs();
      const queryTime = performance.now() - queryStart;
      
      expect(queryTime).toBeLessThan(20);
    });

    it('should efficiently update moving entities', () => {
      const entities: Entity[] = [];
      
      // Create moving entities
      for (let i = 0; i < 100; i++) {
        const entity = createEntity(`${i}`, i * 5, i * 5, 20, 20);
        entities.push(entity);
        spatialGrid.insert(entity);
      }
      
      const startTime = performance.now();
      
      // Simulate movement
      for (let frame = 0; frame < 60; frame++) {
        entities.forEach(entity => {
          entity.x += 2;
          entity.y += 1;
          spatialGrid.update(entity);
        });
      }
      
      const updateTime = performance.now() - startTime;
      expect(updateTime).toBeLessThan(100); // 60 frames of updates
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-sized grid', () => {
      const grid = new SpatialGrid(0, 0, 50);
      expect(grid.getCellCount()).toBe(0);
      
      const entity = createEntity('1', 10, 10, 5, 5);
      expect(() => grid.insert(entity)).not.toThrow();
    });

    it('should handle entities larger than cell size', () => {
      const largeEntity = createEntity('large', 10, 10, 200, 200);
      spatialGrid.insert(largeEntity);
      
      // Should span many cells
      const cellsOccupied = spatialGrid.getCellsForEntity(largeEntity);
      expect(cellsOccupied.length).toBeGreaterThan(10);
    });

    it('should handle negative positions', () => {
      const entity = createEntity('1', -50, -50, 100, 100);
      spatialGrid.insert(entity);
      
      const cell = spatialGrid.getCellAtPosition(0, 0);
      expect(cell.entities).toContain(entity);
    });
  });
});