/**
 * Real-time Performance Monitoring for Particle System
 * Provides dashboard integration and telemetry logging
 */
import { ParticleSystem } from './ParticleSystem';
import { EventBus } from '../core/EventBus';

export interface MonitorConfig {
  updateInterval: number; // milliseconds
  enableTelemetry: boolean;
  enableDashboard: boolean;
  telemetryBufferSize: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  fps: number;
  particleCount: number;
  qualityLevel: number;
  memoryUsage: number;
  drawCalls: number;
  frameTime: number;
}

export interface DashboardData {
  current: PerformanceSnapshot;
  peak: {
    particleCount: number;
    memoryUsage: number;
    drawCalls: number;
  };
  average: {
    fps: number;
    frameTime: number;
    particleCount: number;
  };
  warnings: string[];
  qualityChanges: number;
  telemetryEnabled: boolean;
}

export class ParticleMonitor {
  private particleSystem: ParticleSystem;
  private eventBus: EventBus;
  private config: MonitorConfig;
  private dashboardData: DashboardData;
  private telemetryBuffer: PerformanceSnapshot[];
  private isMonitoring: boolean = false;
  private monitorInterval: number | null = null;
  private startTime: number;
  private qualityChangeCount: number = 0;
  private warningMessages: Set<string> = new Set();
  
  // Performance tracking
  private sampleCount: number = 0;
  private totalFps: number = 0;
  private totalFrameTime: number = 0;
  private totalParticleCount: number = 0;
  
  constructor(particleSystem: ParticleSystem, eventBus: EventBus, config?: Partial<MonitorConfig>) {
    this.particleSystem = particleSystem;
    this.eventBus = eventBus;
    this.config = {
      updateInterval: config?.updateInterval || 100, // Update every 100ms
      enableTelemetry: config?.enableTelemetry !== false,
      enableDashboard: config?.enableDashboard !== false,
      telemetryBufferSize: config?.telemetryBufferSize || 1000
    };
    
    this.startTime = performance.now();
    this.telemetryBuffer = [];
    this.dashboardData = this.initializeDashboardData();
    
    this.setupEventListeners();
  }
  
  /**
   * Initialize dashboard data structure
   */
  private initializeDashboardData(): DashboardData {
    return {
      current: {
        timestamp: 0,
        fps: 60,
        particleCount: 0,
        qualityLevel: 1.0,
        memoryUsage: 0,
        drawCalls: 0,
        frameTime: 0
      },
      peak: {
        particleCount: 0,
        memoryUsage: 0,
        drawCalls: 0
      },
      average: {
        fps: 60,
        frameTime: 16.67,
        particleCount: 0
      },
      warnings: [],
      qualityChanges: 0,
      telemetryEnabled: this.config.enableTelemetry
    };
  }
  
  /**
   * Setup event listeners for performance events
   */
  private setupEventListeners(): void {
    // Quality change events
    this.particleSystem.onPerformanceChange('monitor', (data) => {
      if (data.type === 'qualityChange') {
        this.qualityChangeCount++;
        this.addWarning(`Quality reduced to ${(data.currentLevel * 100).toFixed(0)}% due to low FPS`);
      } else if (data.type === 'memoryWarning') {
        this.addWarning(`Memory usage high: ${(data.utilizationRate * 100).toFixed(0)}% of pool capacity`);
      }
    });
    
    // Performance warning events
    this.eventBus.on('particles:performanceWarning', (data) => {
      this.addWarning(`Performance warning: FPS dropped to ${data.fps.toFixed(0)}`);
    });
    
    this.eventBus.on('particles:performanceCritical', (data) => {
      this.addWarning(`CRITICAL: FPS below ${data.fps.toFixed(0)}, effects disabled`);
    });
    
    this.eventBus.on('particles:memoryWarning', (data) => {
      this.addWarning(`Memory warning: ${(data.utilizationRate * 100).toFixed(0)}% pool usage`);
    });
    
    this.eventBus.on('particles:forceOptimized', (data) => {
      this.addWarning(`Emergency optimization: Removed ${data.particlesRemoved} particles`);
    });
  }
  
  /**
   * Start monitoring
   */
  public start(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.startTime = performance.now();
    
    // Start periodic updates
    this.monitorInterval = window.setInterval(() => {
      this.updateMonitoring();
    }, this.config.updateInterval);
    
    // Emit monitoring started event
    this.eventBus.emit('monitor:started', {
      updateInterval: this.config.updateInterval,
      telemetryEnabled: this.config.enableTelemetry
    });
  }
  
  /**
   * Stop monitoring
   */
  public stop(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    
    if (this.monitorInterval !== null) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    
    // Emit monitoring stopped event
    this.eventBus.emit('monitor:stopped', {
      totalRunTime: performance.now() - this.startTime,
      samplesCollected: this.sampleCount
    });
  }
  
  /**
   * Update monitoring data
   */
  private updateMonitoring(): void {
    const metrics = this.particleSystem.getPerformanceMetrics();
    
    // Create snapshot
    const snapshot: PerformanceSnapshot = {
      timestamp: performance.now(),
      fps: metrics.fps,
      particleCount: metrics.particleCount,
      qualityLevel: metrics.qualityLevel,
      memoryUsage: metrics.memoryUsage,
      drawCalls: metrics.renderStats.drawCalls,
      frameTime: metrics.frameTime
    };
    
    // Update current data
    this.dashboardData.current = snapshot;
    
    // Update statistics
    this.updateStatistics(snapshot);
    
    // Update peak values
    this.updatePeakValues(snapshot);
    
    // Update averages
    this.updateAverages();
    
    // Add to telemetry buffer if enabled
    if (this.config.enableTelemetry) {
      this.addToTelemetry(snapshot);
    }
    
    // Emit dashboard update if enabled
    if (this.config.enableDashboard) {
      this.emitDashboardUpdate();
    }
    
    // Check for alerts
    this.checkAlerts(snapshot);
  }
  
  /**
   * Update statistics
   */
  private updateStatistics(snapshot: PerformanceSnapshot): void {
    this.sampleCount++;
    this.totalFps += snapshot.fps;
    this.totalFrameTime += snapshot.frameTime;
    this.totalParticleCount += snapshot.particleCount;
  }
  
  /**
   * Update peak values
   */
  private updatePeakValues(snapshot: PerformanceSnapshot): void {
    this.dashboardData.peak.particleCount = Math.max(
      this.dashboardData.peak.particleCount,
      snapshot.particleCount
    );
    
    this.dashboardData.peak.memoryUsage = Math.max(
      this.dashboardData.peak.memoryUsage,
      snapshot.memoryUsage
    );
    
    this.dashboardData.peak.drawCalls = Math.max(
      this.dashboardData.peak.drawCalls,
      snapshot.drawCalls
    );
  }
  
  /**
   * Update averages
   */
  private updateAverages(): void {
    if (this.sampleCount > 0) {
      this.dashboardData.average.fps = this.totalFps / this.sampleCount;
      this.dashboardData.average.frameTime = this.totalFrameTime / this.sampleCount;
      this.dashboardData.average.particleCount = this.totalParticleCount / this.sampleCount;
    }
  }
  
  /**
   * Add snapshot to telemetry buffer
   */
  private addToTelemetry(snapshot: PerformanceSnapshot): void {
    this.telemetryBuffer.push(snapshot);
    
    // Maintain buffer size
    if (this.telemetryBuffer.length > this.config.telemetryBufferSize) {
      this.telemetryBuffer.shift();
    }
  }
  
  /**
   * Emit dashboard update event
   */
  private emitDashboardUpdate(): void {
    this.dashboardData.qualityChanges = this.qualityChangeCount;
    this.dashboardData.warnings = Array.from(this.warningMessages).slice(-5); // Last 5 warnings
    
    this.eventBus.emit('monitor:dashboardUpdate', this.dashboardData);
  }
  
  /**
   * Check for performance alerts
   */
  private checkAlerts(snapshot: PerformanceSnapshot): void {
    // FPS alert
    if (snapshot.fps < 30) {
      this.eventBus.emit('monitor:alert', {
        type: 'critical',
        message: `Critical FPS: ${snapshot.fps.toFixed(0)}`,
        timestamp: snapshot.timestamp
      });
    } else if (snapshot.fps < 50) {
      this.eventBus.emit('monitor:alert', {
        type: 'warning',
        message: `Low FPS: ${snapshot.fps.toFixed(0)}`,
        timestamp: snapshot.timestamp
      });
    }
    
    // Memory alert
    if (snapshot.memoryUsage > 0.9) {
      this.eventBus.emit('monitor:alert', {
        type: 'critical',
        message: `Critical memory usage: ${(snapshot.memoryUsage * 100).toFixed(0)}%`,
        timestamp: snapshot.timestamp
      });
    } else if (snapshot.memoryUsage > 0.8) {
      this.eventBus.emit('monitor:alert', {
        type: 'warning',
        message: `High memory usage: ${(snapshot.memoryUsage * 100).toFixed(0)}%`,
        timestamp: snapshot.timestamp
      });
    }
    
    // Particle count alert
    const maxParticles = 1000; // Hard limit from requirements
    const particleRatio = snapshot.particleCount / maxParticles;
    if (particleRatio > 0.9) {
      this.eventBus.emit('monitor:alert', {
        type: 'warning',
        message: `Near particle limit: ${snapshot.particleCount}/${maxParticles}`,
        timestamp: snapshot.timestamp
      });
    }
  }
  
  /**
   * Add warning message
   */
  private addWarning(message: string): void {
    const timestampedMessage = `[${new Date().toLocaleTimeString()}] ${message}`;
    this.warningMessages.add(timestampedMessage);
    
    // Keep only last 10 warnings
    if (this.warningMessages.size > 10) {
      const messages = Array.from(this.warningMessages);
      messages.shift();
      this.warningMessages = new Set(messages);
    }
  }
  
  /**
   * Get current dashboard data
   */
  public getDashboardData(): DashboardData {
    return { ...this.dashboardData };
  }
  
  /**
   * Get telemetry data
   */
  public getTelemetry(limit?: number): PerformanceSnapshot[] {
    if (limit && limit < this.telemetryBuffer.length) {
      return this.telemetryBuffer.slice(-limit);
    }
    return [...this.telemetryBuffer];
  }
  
  /**
   * Export telemetry data as CSV
   */
  public exportTelemetryCSV(): string {
    const headers = ['timestamp', 'fps', 'particleCount', 'qualityLevel', 'memoryUsage', 'drawCalls', 'frameTime'];
    const rows = this.telemetryBuffer.map(snapshot => [
      snapshot.timestamp.toFixed(2),
      snapshot.fps.toFixed(2),
      snapshot.particleCount.toString(),
      snapshot.qualityLevel.toFixed(2),
      snapshot.memoryUsage.toFixed(4),
      snapshot.drawCalls.toString(),
      snapshot.frameTime.toFixed(2)
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
  
  /**
   * Reset monitoring statistics
   */
  public reset(): void {
    this.sampleCount = 0;
    this.totalFps = 0;
    this.totalFrameTime = 0;
    this.totalParticleCount = 0;
    this.qualityChangeCount = 0;
    this.warningMessages.clear();
    this.telemetryBuffer = [];
    this.dashboardData = this.initializeDashboardData();
    this.startTime = performance.now();
  }
  
  /**
   * Enable or disable telemetry
   */
  public setTelemetryEnabled(enabled: boolean): void {
    this.config.enableTelemetry = enabled;
    this.dashboardData.telemetryEnabled = enabled;
    
    if (!enabled) {
      this.telemetryBuffer = [];
    }
  }
  
  /**
   * Enable or disable dashboard updates
   */
  public setDashboardEnabled(enabled: boolean): void {
    this.config.enableDashboard = enabled;
  }
  
  /**
   * Set update interval
   */
  public setUpdateInterval(interval: number): void {
    this.config.updateInterval = interval;
    
    // Restart monitoring with new interval if active
    if (this.isMonitoring) {
      this.stop();
      this.start();
    }
  }
  
  /**
   * Get monitoring status
   */
  public getStatus(): {
    isMonitoring: boolean;
    uptime: number;
    samplesCollected: number;
    config: MonitorConfig;
  } {
    return {
      isMonitoring: this.isMonitoring,
      uptime: this.isMonitoring ? performance.now() - this.startTime : 0,
      samplesCollected: this.sampleCount,
      config: { ...this.config }
    };
  }
  
  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    this.particleSystem.offPerformanceChange('monitor');
    this.eventBus.off('particles:performanceWarning');
    this.eventBus.off('particles:performanceCritical');
    this.eventBus.off('particles:memoryWarning');
    this.eventBus.off('particles:forceOptimized');
    this.telemetryBuffer = [];
    this.warningMessages.clear();
  }
}