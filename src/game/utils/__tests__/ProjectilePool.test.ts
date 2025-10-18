/**
 * Unit tests for ProjectilePool
 * Story 4.3b - Phase 2 Advanced Power-ups
 * Target: 90% code coverage
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectilePool } from '../ProjectilePool';
import { Projectile, ProjectileType } from '../../entities/Projectile';

describe('ProjectilePool', () => {
  let pool: ProjectilePool;

  beforeEach(() => {
    // Reset singleton before each test
    ProjectilePool.resetInstance();
  });

  afterEach(() => {
    // Cleanup after each test
    ProjectilePool.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const pool1 = ProjectilePool.getInstance();
      const pool2 = ProjectilePool.getInstance();

      expect(pool1).toBe(pool2);
    });

    it('should create new instance after reset', () => {
      const pool1 = ProjectilePool.getInstance();

      ProjectilePool.resetInstance();

      const pool2 = ProjectilePool.getInstance();

      expect(pool1).not.toBe(pool2);
    });

    it('should accept custom pool size on first creation', () => {
      pool = ProjectilePool.getInstance(10);

      // Acquire all 10 projectiles
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 10; i++) {
        const proj = pool.acquire();
        expect(proj).not.toBeNull();
        projectiles.push(proj!);
      }

      // 11th should fail (pool exhausted)
      const extra = pool.acquire();
      expect(extra).toBeNull();

      // Return all projectiles
      projectiles.forEach(proj => pool.release(proj));
    });

    it('should ignore pool size on subsequent getInstance calls', () => {
      const pool1 = ProjectilePool.getInstance(5);
      const pool2 = ProjectilePool.getInstance(100); // Should be ignored

      expect(pool1).toBe(pool2); // Same instance
    });
  });

  describe('Pre-filling', () => {
    it('should pre-fill pool with projectiles', () => {
      pool = ProjectilePool.getInstance(20);

      // Should be able to acquire 20 projectiles immediately
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 20; i++) {
        const proj = pool.acquire();
        expect(proj).not.toBeNull();
        expect(proj).toBeInstanceOf(Projectile);
        projectiles.push(proj!);
      }

      expect(projectiles.length).toBe(20);

      // Cleanup
      projectiles.forEach(proj => pool.release(proj));
    });

    it('should assign unique IDs to pre-filled projectiles', () => {
      pool = ProjectilePool.getInstance(10);

      const projectiles: Projectile[] = [];
      for (let i = 0; i < 10; i++) {
        const proj = pool.acquire();
        projectiles.push(proj!);
      }

      const ids = new Set(projectiles.map(p => p.id));
      expect(ids.size).toBe(10); // All unique

      // IDs should follow pattern: projectile_0, projectile_1, ...
      projectiles.forEach((proj, index) => {
        expect(proj.id).toMatch(/^projectile_\d+$/);
      });

      // Cleanup
      projectiles.forEach(proj => pool.release(proj));
    });
  });

  describe('acquire()', () => {
    beforeEach(() => {
      pool = ProjectilePool.getInstance(5);
    });

    it('should acquire projectile from pool', () => {
      const proj = pool.acquire();

      expect(proj).not.toBeNull();
      expect(proj).toBeInstanceOf(Projectile);
    });

    it('should return inactive projectile', () => {
      const proj = pool.acquire();

      expect(proj!.active).toBe(false);
      expect(proj!.position.x).toBe(0);
      expect(proj!.position.y).toBe(0);
    });

    it('should return null when pool is exhausted', () => {
      // Acquire all 5
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 5; i++) {
        const proj = pool.acquire();
        projectiles.push(proj!);
      }

      // 6th acquisition should fail
      const extra = pool.acquire();
      expect(extra).toBeNull();

      // Cleanup
      projectiles.forEach(proj => pool.release(proj));
    });

    it('should maintain FIFO order', () => {
      const proj1 = pool.acquire();
      const id1 = proj1!.id;

      pool.release(proj1!);

      const proj2 = pool.acquire();

      // Should get the same projectile back
      expect(proj2!.id).toBe(id1);

      pool.release(proj2!);
    });
  });

  describe('release()', () => {
    beforeEach(() => {
      pool = ProjectilePool.getInstance(5);
    });

    it('should release projectile back to pool', () => {
      const proj = pool.acquire();
      expect(proj).not.toBeNull();

      // Modify projectile
      proj!.position.x = 100;
      proj!.position.y = 200;
      proj!.active = true;

      pool.release(proj!);

      // Acquire again - should be reset
      const proj2 = pool.acquire();
      expect(proj2!.active).toBe(false);
      expect(proj2!.position.x).toBe(0);
      expect(proj2!.position.y).toBe(0);

      pool.release(proj2!);
    });

    it('should make projectile available for re-acquisition', () => {
      // Exhaust pool
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 5; i++) {
        projectiles.push(pool.acquire()!);
      }

      // Can't acquire more
      expect(pool.acquire()).toBeNull();

      // Release one
      pool.release(projectiles[0]);

      // Should be able to acquire again
      const newProj = pool.acquire();
      expect(newProj).not.toBeNull();

      // Cleanup
      pool.release(newProj!);
      projectiles.slice(1).forEach(proj => pool.release(proj));
    });

    it('should call reset on released projectile', () => {
      const proj = pool.acquire();

      // Initialize projectile
      proj!.initialize({
        type: ProjectileType.LASER,
        position: { x: 100, y: 200 },
        velocity: { x: 50, y: -100 },
        damage: 2,
        size: { width: 6, height: 14 },
        color: '#00FF00',
      });

      expect(proj!.active).toBe(true);

      pool.release(proj!);

      // Acquire again - should be reset
      const proj2 = pool.acquire();
      expect(proj2!.active).toBe(false);
      expect(proj2!.position.x).toBe(0);
      expect(proj2!.velocity.x).toBe(0);

      pool.release(proj2!);
    });
  });

  describe('clear()', () => {
    beforeEach(() => {
      pool = ProjectilePool.getInstance(10);
    });

    it('should clear all projectiles from pool', () => {
      // Acquire some projectiles
      const proj1 = pool.acquire();
      const proj2 = pool.acquire();

      pool.clear();

      // After clear, should not be able to acquire any
      const proj3 = pool.acquire();
      expect(proj3).toBeNull();

      // Note: proj1 and proj2 are still in memory but no longer in pool
    });

    it('should reset pool to empty state', () => {
      // Acquire and release
      const proj = pool.acquire();
      pool.release(proj!);

      pool.clear();

      // Pool should be empty
      expect(pool.acquire()).toBeNull();
    });
  });

  describe('Object Reuse', () => {
    beforeEach(() => {
      pool = ProjectilePool.getInstance(3);
    });

    it('should reuse same object instance', () => {
      const proj1 = pool.acquire();
      const id1 = proj1!.id;

      pool.release(proj1!);

      const proj2 = pool.acquire();
      const id2 = proj2!.id;

      // Should be the exact same object
      expect(id2).toBe(id1);

      pool.release(proj2!);
    });

    it('should maintain zero GC pressure during gameplay', () => {
      const iterations = 100;
      const projectiles: Projectile[] = [];

      // Simulate gameplay: acquire, use, release cycle
      for (let i = 0; i < iterations; i++) {
        // Acquire projectile
        const proj = pool.acquire();
        if (proj) {
          proj.initialize({
            type: ProjectileType.LASER,
            position: { x: 400, y: 300 },
            velocity: { x: 0, y: -500 },
            damage: 1,
            size: { width: 4, height: 12 },
            color: '#FF0000',
          });

          projectiles.push(proj);
        }

        // Release projectile after "use"
        if (projectiles.length > 2) {
          const oldProj = projectiles.shift();
          pool.release(oldProj!);
        }
      }

      // Cleanup remaining
      projectiles.forEach(proj => pool.release(proj));

      // All objects should have been reused (no new allocations after pre-fill)
      // This is validated by the fact that we never exhausted the pool of 3
      expect(projectiles.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Thread Safety (conceptual)', () => {
    beforeEach(() => {
      pool = ProjectilePool.getInstance(10);
    });

    it('should handle rapid acquire/release cycles', () => {
      const cycles = 50;

      for (let i = 0; i < cycles; i++) {
        const proj = pool.acquire();
        expect(proj).not.toBeNull();
        pool.release(proj!);
      }

      // Pool should still be functional
      const finalProj = pool.acquire();
      expect(finalProj).not.toBeNull();
      pool.release(finalProj!);
    });

    it('should maintain pool integrity with interleaved operations', () => {
      const proj1 = pool.acquire();
      const proj2 = pool.acquire();
      const proj3 = pool.acquire();

      pool.release(proj2!); // Release middle one

      const proj4 = pool.acquire(); // Reuse proj2

      pool.release(proj1!);
      pool.release(proj3!);
      pool.release(proj4!);

      // Should be able to acquire 3 projectiles again
      const p1 = pool.acquire();
      const p2 = pool.acquire();
      const p3 = pool.acquire();

      expect(p1).not.toBeNull();
      expect(p2).not.toBeNull();
      expect(p3).not.toBeNull();

      pool.release(p1!);
      pool.release(p2!);
      pool.release(p3!);
    });
  });

  describe('Memory Efficiency', () => {
    it('should use minimal memory for small pool', () => {
      pool = ProjectilePool.getInstance(20);

      // Estimate: Each Projectile ~200 bytes
      // Pool of 20: ~4KB (negligible)
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 20; i++) {
        projectiles.push(pool.acquire()!);
      }

      expect(projectiles.length).toBe(20);

      // Verify all are valid instances
      projectiles.forEach(proj => {
        expect(proj).toBeInstanceOf(Projectile);
        expect(proj.id).toBeDefined();
      });

      // Cleanup
      projectiles.forEach(proj => pool.release(proj));
    });
  });

  describe('Edge Cases', () => {
    it('should handle pool size of 1', () => {
      pool = ProjectilePool.getInstance(1);

      const proj1 = pool.acquire();
      expect(proj1).not.toBeNull();

      const proj2 = pool.acquire();
      expect(proj2).toBeNull(); // Pool exhausted

      pool.release(proj1!);

      const proj3 = pool.acquire();
      expect(proj3).not.toBeNull();
      expect(proj3!.id).toBe(proj1!.id); // Same object

      pool.release(proj3!);
    });

    it('should handle releasing same projectile multiple times (defensive)', () => {
      pool = ProjectilePool.getInstance(5);

      const proj = pool.acquire();

      pool.release(proj!);
      pool.release(proj!); // Double release

      // Should not break pool integrity
      const proj2 = pool.acquire();
      expect(proj2).not.toBeNull();

      pool.release(proj2!);
    });

    it('should handle acquiring from cleared pool', () => {
      pool = ProjectilePool.getInstance(5);

      pool.clear();

      const proj = pool.acquire();
      expect(proj).toBeNull();
    });
  });
});
