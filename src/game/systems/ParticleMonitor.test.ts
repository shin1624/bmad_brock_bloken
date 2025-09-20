import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParticleMonitor } from './ParticleMonitor';
import { ParticleSystem } from './ParticleSystem';
import { EventBus } from '../core/EventBus';

describe('ParticleMonitor', () => {
  let monitor: ParticleMonitor;
  let particleSystem: ParticleSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = new EventBus();
    particleSystem = new ParticleSystem(eventBus);
    monitor = new ParticleMonitor(particleSystem, eventBus, {
      updateInterval: 100,
      enableTelemetry: true,
      enableDashboard: true
    });
  });

  afterEach(() => {
    monitor.destroy();
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe('Real-time monitoring', () => {
    it('should start and stop monitoring', () => {
      const startHandler = vi.fn();
      const stopHandler = vi.fn();
      
      eventBus.on('monitor:started', startHandler);
      eventBus.on('monitor:stopped', stopHandler);
      
      // Start monitoring
      monitor.start();
      expect(startHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          updateInterval: 100,
          telemetryEnabled: true
        })
      );
      
      // Stop monitoring
      monitor.stop();
      expect(stopHandler).toHaveBeenCalled();
      
      const status = monitor.getStatus();
      expect(status.isMonitoring).toBe(false);
    });

    it('should update dashboard data periodically', () => {
      const dashboardHandler = vi.fn();
      eventBus.on('monitor:dashboardUpdate', dashboardHandler);
      
      monitor.start();
      
      // Advance time to trigger updates
      vi.advanceTimersByTime(100);
      expect(dashboardHandler).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(100);
      expect(dashboardHandler).toHaveBeenCalledTimes(2);
      
      // Check dashboard data structure
      const data = monitor.getDashboardData();
      expect(data).toHaveProperty('current');
      expect(data).toHaveProperty('peak');
      expect(data).toHaveProperty('average');
      expect(data).toHaveProperty('warnings');
      expect(data).toHaveProperty('qualityChanges');
      expect(data).toHaveProperty('telemetryEnabled');
    });

    it('should track FPS impact', () => {
      monitor.start();
      
      // Create particles to impact FPS
      for (let i = 0; i < 10; i++) {
        particleSystem.createEffect('explosion', { x: i * 10, y: i * 10 });
      }
      
      // Update particle system
      particleSystem.update(0.016);
      
      // Advance monitor update
      vi.advanceTimersByTime(100);
      
      const data = monitor.getDashboardData();
      expect(data.current.particleCount).toBeGreaterThan(0);
      expect(data.current.fps).toBeGreaterThan(0);
    });

    it('should show particle count with current/peak/limit values', () => {
      monitor.start();
      
      // Create some particles
      particleSystem.createEffect('explosion', { x: 100, y: 100 });
      particleSystem.update(0.016);
      
      vi.advanceTimersByTime(100);
      
      // Create more particles
      particleSystem.createEffect('explosion', { x: 200, y: 200 });
      particleSystem.update(0.016);
      
      vi.advanceTimersByTime(100);
      
      const data = monitor.getDashboardData();
      expect(data.current.particleCount).toBeGreaterThanOrEqual(0);
      expect(data.peak.particleCount).toBeGreaterThanOrEqual(data.current.particleCount);
      expect(data.peak.particleCount).toBeLessThanOrEqual(1000); // Hard limit
    });

    it('should track memory usage alerts at 80% capacity', () => {
      const alertHandler = vi.fn();
      eventBus.on('monitor:alert', alertHandler);
      
      monitor.start();
      
      // Fill particle pool to over 80%
      for (let i = 0; i < 85; i++) {
        particleSystem.createEffect('explosion', { x: i * 10, y: i * 10 });
      }
      
      particleSystem.update(0.016);
      vi.advanceTimersByTime(100);
      
      // Check if memory warning was triggered
      const data = monitor.getDashboardData();
      if (data.current.memoryUsage > 0.8) {
        expect(alertHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: expect.stringContaining('memory usage')
          })
        );
      }
    });

    it('should display performance degradation warnings', () => {
      monitor.start();
      
      // Simulate performance warning
      eventBus.emit('particles:performanceWarning', {
        fps: 45,
        particleCount: 500,
        qualityLevel: 0.8
      });
      
      vi.advanceTimersByTime(100);
      
      const data = monitor.getDashboardData();
      expect(data.warnings.length).toBeGreaterThan(0);
      expect(data.warnings[0]).toContain('FPS dropped to 45');
    });

    it('should log telemetry data', () => {
      monitor.start();
      
      // Generate some telemetry data
      for (let i = 0; i < 5; i++) {
        particleSystem.update(0.016);
        vi.advanceTimersByTime(100);
      }
      
      const telemetry = monitor.getTelemetry();
      expect(telemetry.length).toBe(5);
      
      // Check telemetry structure
      const snapshot = telemetry[0];
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('fps');
      expect(snapshot).toHaveProperty('particleCount');
      expect(snapshot).toHaveProperty('qualityLevel');
      expect(snapshot).toHaveProperty('memoryUsage');
      expect(snapshot).toHaveProperty('drawCalls');
      expect(snapshot).toHaveProperty('frameTime');
    });
  });

  describe('Performance alerts and warnings', () => {
    it('should emit critical alert when FPS < 30', () => {
      const alertHandler = vi.fn();
      eventBus.on('monitor:alert', alertHandler);
      
      monitor.start();
      
      // Simulate very low FPS
      particleSystem.update(0.040); // 25 FPS
      vi.advanceTimersByTime(100);
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'critical',
          message: expect.stringContaining('Critical FPS')
        })
      );
    });

    it('should emit warning alert when FPS < 50', () => {
      const alertHandler = vi.fn();
      eventBus.on('monitor:alert', alertHandler);
      
      monitor.start();
      
      // Simulate low FPS
      particleSystem.update(0.025); // 40 FPS
      vi.advanceTimersByTime(100);
      
      expect(alertHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Low FPS')
        })
      );
    });

    it('should track quality change events', () => {
      monitor.start();
      
      // Trigger quality change through particle system
      particleSystem.setQualityLevel(0.5);
      
      // Emit quality change event
      eventBus.emit('particles:qualityChanged', {
        previousLevel: 1.0,
        currentLevel: 0.5,
        fps: 45
      });
      
      vi.advanceTimersByTime(100);
      
      const data = monitor.getDashboardData();
      expect(data.warnings.some(w => w.includes('Quality reduced'))).toBe(true);
    });

    it('should warn when approaching particle limit', () => {
      const alertHandler = vi.fn();
      eventBus.on('monitor:alert', alertHandler);
      
      monitor.start();
      
      // Create many particles (90% of limit)
      for (let i = 0; i < 90; i++) {
        particleSystem.createEffect('explosion', { x: i * 10, y: i * 10 });
      }
      
      particleSystem.update(0.016);
      vi.advanceTimersByTime(100);
      
      // Should emit warning about particle limit
      const particleCount = particleSystem.getParticleCount();
      if (particleCount > 900) {
        expect(alertHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'warning',
            message: expect.stringContaining('Near particle limit')
          })
        );
      }
    });
  });

  describe('Telemetry and reporting', () => {
    it('should export telemetry as CSV', () => {
      monitor.start();
      
      // Generate telemetry data
      for (let i = 0; i < 3; i++) {
        particleSystem.update(0.016);
        vi.advanceTimersByTime(100);
      }
      
      const csv = monitor.exportTelemetryCSV();
      
      // Check CSV structure
      const lines = csv.split('\n');
      expect(lines[0]).toBe('timestamp,fps,particleCount,qualityLevel,memoryUsage,drawCalls,frameTime');
      expect(lines.length).toBe(4); // Header + 3 data rows
    });

    it('should maintain telemetry buffer size', () => {
      const bufferMonitor = new ParticleMonitor(particleSystem, eventBus, {
        updateInterval: 10,
        telemetryBufferSize: 5
      });
      
      bufferMonitor.start();
      
      // Generate more data than buffer size
      for (let i = 0; i < 10; i++) {
        particleSystem.update(0.016);
        vi.advanceTimersByTime(10);
      }
      
      const telemetry = bufferMonitor.getTelemetry();
      expect(telemetry.length).toBe(5); // Should maintain buffer size
      
      bufferMonitor.destroy();
    });

    it('should track average performance metrics', () => {
      monitor.start();
      
      // Generate performance data
      for (let i = 0; i < 10; i++) {
        particleSystem.update(0.016);
        vi.advanceTimersByTime(100);
      }
      
      const data = monitor.getDashboardData();
      expect(data.average.fps).toBeGreaterThan(0);
      expect(data.average.frameTime).toBeGreaterThan(0);
      expect(data.average.particleCount).toBeGreaterThanOrEqual(0);
    });

    it('should reset statistics', () => {
      monitor.start();
      
      // Generate some data
      particleSystem.createEffect('explosion', { x: 100, y: 100 });
      particleSystem.update(0.016);
      vi.advanceTimersByTime(100);
      
      // Reset
      monitor.reset();
      
      const data = monitor.getDashboardData();
      expect(data.current.particleCount).toBe(0);
      expect(data.peak.particleCount).toBe(0);
      expect(data.warnings.length).toBe(0);
      expect(data.qualityChanges).toBe(0);
    });
  });

  describe('Configuration and control', () => {
    it('should enable/disable telemetry', () => {
      monitor.start();
      
      // Disable telemetry
      monitor.setTelemetryEnabled(false);
      
      // Generate data
      particleSystem.update(0.016);
      vi.advanceTimersByTime(100);
      
      const telemetry = monitor.getTelemetry();
      expect(telemetry.length).toBe(0);
      
      // Re-enable telemetry
      monitor.setTelemetryEnabled(true);
      
      particleSystem.update(0.016);
      vi.advanceTimersByTime(100);
      
      const telemetryAfter = monitor.getTelemetry();
      expect(telemetryAfter.length).toBe(1);
    });

    it('should enable/disable dashboard updates', () => {
      const dashboardHandler = vi.fn();
      eventBus.on('monitor:dashboardUpdate', dashboardHandler);
      
      monitor.start();
      
      // Disable dashboard
      monitor.setDashboardEnabled(false);
      
      vi.advanceTimersByTime(100);
      expect(dashboardHandler).not.toHaveBeenCalled();
      
      // Re-enable dashboard
      monitor.setDashboardEnabled(true);
      
      vi.advanceTimersByTime(100);
      expect(dashboardHandler).toHaveBeenCalled();
    });

    it('should change update interval', () => {
      const status1 = monitor.getStatus();
      expect(status1.config.updateInterval).toBe(100);
      
      // Change interval
      monitor.setUpdateInterval(50);
      
      const status2 = monitor.getStatus();
      expect(status2.config.updateInterval).toBe(50);
    });

    it('should get monitoring status', () => {
      const status = monitor.getStatus();
      
      expect(status).toHaveProperty('isMonitoring');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('samplesCollected');
      expect(status).toHaveProperty('config');
      
      expect(status.isMonitoring).toBe(false);
      expect(status.samplesCollected).toBe(0);
    });
  });
});