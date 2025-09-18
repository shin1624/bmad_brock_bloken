/**
 * Integrated Memory Management System
 * Phase 3: Comprehensive memory efficiency and GC pressure reduction
 */
import { PowerUpPool, PowerUpPoolConfig, PowerUpPoolStats } from '../utils/PowerUpPool';
import { ParticlePool, ParticlePoolConfig, ParticlePoolStats } from '../utils/ParticlePool';
import { ObjectPool } from '../utils/ObjectPool';
import { EventBus } from '../core/EventBus';
import { PowerUpType } from '../entities/PowerUp';

export interface MemoryManagerConfig {
  // Global memory settings
  maxTotalMemoryMB: number;
  gcPressureThreshold: number; // 0-1 scale
  enableAutoOptimization: boolean;
  enablePreemptiveGC: boolean;
  
  // Monitoring
  monitoringInterval: number;
  alertThreshold: number;
  enableProfiling: boolean;
  
  // Pool configurations
  powerUpPoolConfig: Partial<PowerUpPoolConfig>;
  particlePoolConfig: Partial<ParticlePoolConfig>;
}

export interface MemoryStats {
  totalMemoryMB: number;
  powerUpMemoryMB: number;
  particleMemoryMB: number;
  otherMemoryMB: number;
  gcPressure: number;
  fragmentationRatio: number;
  
  // Performance metrics
  allocationsPerSecond: number;
  deallocationsPerSecond: number;
  gcEventsPerMinute: number;
  averagePoolUtilization: number;
  
  // Health indicators
  isHealthy: boolean;
  warningMessages: string[];
  criticalIssues: string[];
  
  // Additional stats for compatibility
  totalPools: number;
  totalAllocated: number;
  totalReused: number;
  memoryUsage: number;
  gcEvents: number;
  utilizationByType: Record<string, number>;
}

export interface MemoryEvent {
  type: 'warning' | 'critical' | 'optimization' | 'gc';
  message: string;
  timestamp: number;
  data?: any;
}

/**
 * Central Memory Management System
 * Coordinates all object pools and monitors memory health
 */
export class MemoryManager {
  private config: MemoryManagerConfig;
  private powerUpPool: PowerUpPool;
  private particlePool: ParticlePool;
  private eventBus: EventBus;
  
  // Monitoring
  private stats: MemoryStats;
  private monitoringTimer: number | null = null;
  private lastStatsUpdate: number = 0;
  private eventHistory: MemoryEvent[] = [];
  
  // Performance tracking
  private allocationsCount: number = 0;
  private deallocationsCount: number = 0;
  private lastAllocationCheck: number = 0;
  private gcEventCount: number = 0;
  private lastGCCheck: number = 0;

  constructor(eventBus: EventBus, config?: Partial<MemoryManagerConfig>) {
    this.eventBus = eventBus;
    this.config = {
      maxTotalMemoryMB: 100,
      gcPressureThreshold: 0.8,
      enableAutoOptimization: true,
      enablePreemptiveGC: true,
      monitoringInterval: 5000, // 5 seconds
      alertThreshold: 0.9,
      enableProfiling: false,
      powerUpPoolConfig: {},
      particlePoolConfig: {},
      ...config
    };

    this.stats = this.initializeStats();
    this.initializePools();
    this.startMonitoring();
    this.setupEventListeners();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): MemoryStats {
    return {
      totalMemoryMB: 0,
      powerUpMemoryMB: 0,
      particleMemoryMB: 0,
      otherMemoryMB: 0,
      gcPressure: 0,
      fragmentationRatio: 0,
      allocationsPerSecond: 0,
      deallocationsPerSecond: 0,
      gcEventsPerMinute: 0,
      averagePoolUtilization: 0,
      isHealthy: true,
      warningMessages: [],
      criticalIssues: [],
      totalPools: 0,
      totalAllocated: 0,
      totalReused: 0,
      memoryUsage: 0,
      gcEvents: 0,
      utilizationByType: {}
    };
  }

  /**
   * Initialize object pools
   */
  private initializePools(): void {
    this.powerUpPool = new PowerUpPool({
      enableDebug: this.config.enableProfiling,
      ...this.config.powerUpPoolConfig
    });

    this.particlePool = new ParticlePool({
      enableBatching: true,
      enableSpatialOptimization: true,
      enableLOD: true,
      ...this.config.particlePoolConfig
    });
  }

  /**
   * Start memory monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }

    this.monitoringTimer = window.setInterval(() => {
      this.updateStats();
      this.checkMemoryHealth();
      this.performAutoOptimization();
    }, this.config.monitoringInterval);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen for game state changes that affect memory
    this.eventBus.on('game:state:changed', (state: string) => {
      if (state === 'menu' || state === 'gameOver') {
        this.performCleanup();
      }
    });

    // Listen for level changes
    this.eventBus.on('level:changed', () => {
      this.performLevelTransitionOptimization();
    });

    // Listen for performance warnings
    this.eventBus.on('performance:warning', (data: any) => {
      this.handlePerformanceWarning(data);
    });
  }

  /**
   * Update memory statistics
   */
  private updateStats(): void {
    const now = Date.now();
    
    // Get pool statistics
    const powerUpStats = this.powerUpPool.getOverallStats();
    const particleStats = this.particlePool.getStats();
    
    // Update memory usage
    this.stats.powerUpMemoryMB = powerUpStats.memoryUsage;
    this.stats.particleMemoryMB = particleStats.memoryUsage;
    this.stats.otherMemoryMB = this.estimateOtherMemoryUsage();
    this.stats.totalMemoryMB = this.stats.powerUpMemoryMB + this.stats.particleMemoryMB + this.stats.otherMemoryMB;
    
    // Calculate GC pressure
    this.stats.gcPressure = this.stats.totalMemoryMB / this.config.maxTotalMemoryMB;
    
    // Calculate fragmentation (rough estimate)
    this.stats.fragmentationRatio = this.calculateFragmentationRatio(powerUpStats, particleStats);
    
    // Update performance metrics
    this.updatePerformanceMetrics(now, powerUpStats, particleStats);
    
    // Update health status
    this.updateHealthStatus();
    
    this.lastStatsUpdate = now;
  }

  /**
   * Estimate memory usage from other systems
   */
  private estimateOtherMemoryUsage(): number {
    // Rough estimation for game objects, textures, audio, etc.
    // This would be more accurate with actual memory profiling
    return 5; // 5MB baseline
  }

  /**
   * Calculate memory fragmentation ratio
   */
  private calculateFragmentationRatio(powerUpStats: PowerUpPoolStats, particleStats: ParticlePoolStats): number {
    const totalUtilization = (powerUpStats.totalAllocated + particleStats.activeParticles) /
                            (powerUpStats.totalAllocated + particleStats.totalParticles + 1);
    
    // Fragmentation is inverse of utilization
    return 1 - totalUtilization;
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(now: number, powerUpStats: PowerUpPoolStats, particleStats: ParticlePoolStats): void {
    const deltaTime = (now - this.lastAllocationCheck) / 1000;
    
    if (deltaTime > 0) {
      // Calculate allocation rates (simplified)
      this.stats.allocationsPerSecond = (powerUpStats.totalAllocated + particleStats.totalParticles) / deltaTime;
      this.stats.deallocationsPerSecond = (powerUpStats.totalReused) / deltaTime;
      
      this.lastAllocationCheck = now;
    }
    
    // GC events per minute
    const gcDeltaTime = (now - this.lastGCCheck) / 60000; // minutes
    if (gcDeltaTime > 0) {
      this.stats.gcEventsPerMinute = (powerUpStats.gcEvents + particleStats.gcEvents) / gcDeltaTime;
      this.lastGCCheck = now;
    }
    
    // Average pool utilization
    const totalPools = Object.keys(powerUpStats.utilizationByType).length + 1; // +1 for particle pool
    const totalUtilization = Object.values(powerUpStats.utilizationByType).reduce((sum, util) => sum + util, 0) +
                            particleStats.utilizationRate;
    this.stats.averagePoolUtilization = totalUtilization / totalPools;
  }

  /**
   * Update health status
   */
  private updateHealthStatus(): void {
    this.stats.warningMessages = [];
    this.stats.criticalIssues = [];
    
    // Check memory pressure
    if (this.stats.gcPressure > this.config.alertThreshold) {
      this.stats.criticalIssues.push(`High memory pressure: ${(this.stats.gcPressure * 100).toFixed(1)}%`);
    } else if (this.stats.gcPressure > this.config.gcPressureThreshold) {
      this.stats.warningMessages.push(`Elevated memory pressure: ${(this.stats.gcPressure * 100).toFixed(1)}%`);
    }
    
    // Check fragmentation
    if (this.stats.fragmentationRatio > 0.5) {
      this.stats.warningMessages.push(`High memory fragmentation: ${(this.stats.fragmentationRatio * 100).toFixed(1)}%`);
    }
    
    // Check pool utilization
    if (this.stats.averagePoolUtilization > 0.9) {
      this.stats.warningMessages.push(`Pool utilization very high: ${(this.stats.averagePoolUtilization * 100).toFixed(1)}%`);
    }
    
    // Overall health
    this.stats.isHealthy = this.stats.criticalIssues.length === 0;
  }

  /**
   * Check memory health and emit events
   */
  private checkMemoryHealth(): void {
    // Emit warning events
    this.stats.warningMessages.forEach(message => {
      this.emitMemoryEvent('warning', message);
    });
    
    // Emit critical events
    this.stats.criticalIssues.forEach(issue => {
      this.emitMemoryEvent('critical', issue);
    });
    
    // Emit memory pressure events
    if (this.stats.gcPressure > this.config.gcPressureThreshold) {
      this.eventBus.emit('memory:pressure', {
        level: this.stats.gcPressure,
        totalMemory: this.stats.totalMemoryMB
      });
    }
  }

  /**
   * Emit memory event
   */
  private emitMemoryEvent(type: MemoryEvent['type'], message: string, data?: any): void {
    const event: MemoryEvent = {
      type,
      message,
      timestamp: Date.now(),
      data
    };
    
    this.eventHistory.push(event);
    
    // Keep only recent events (last 100)
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }
    
    // Emit to event bus
    this.eventBus.emit(`memory:${type}`, event);
  }

  /**
   * Perform automatic optimization
   */
  private performAutoOptimization(): void {
    if (!this.config.enableAutoOptimization) {
      return;
    }
    
    // Optimize pools if pressure is high
    if (this.stats.gcPressure > this.config.gcPressureThreshold) {
      this.optimizePools();
    }
    
    // Preemptive GC if enabled
    if (this.config.enablePreemptiveGC && this.stats.gcPressure > 0.7) {
      this.performPreemptiveGC();
    }
  }

  /**
   * Optimize all pools
   */
  private optimizePools(): void {
    this.powerUpPool.optimizePools();
    // Particle pool optimization would be added here
    
    this.emitMemoryEvent('optimization', 'Performed automatic pool optimization');
  }

  /**
   * Perform preemptive garbage collection
   */
  private performPreemptiveGC(): void {
    this.powerUpPool.forceGC();
    // Force browser GC if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    this.emitMemoryEvent('gc', 'Performed preemptive garbage collection');
  }

  /**
   * Handle performance warnings
   */
  private handlePerformanceWarning(data: any): void {
    if (data.type === 'memory' || data.memoryRelated) {
      this.performEmergencyOptimization();
    }
  }

  /**
   * Perform emergency optimization
   */
  private performEmergencyOptimization(): void {
    // Aggressive cleanup
    this.powerUpPool.clear();
    this.particlePool.clear();
    
    // Force GC
    this.performPreemptiveGC();
    
    this.emitMemoryEvent('critical', 'Performed emergency memory optimization');
  }

  /**
   * Perform cleanup during game state transitions
   */
  private performCleanup(): void {
    this.particlePool.clear();
    this.optimizePools();
    
    this.emitMemoryEvent('optimization', 'Performed state transition cleanup');
  }

  /**
   * Optimize memory during level transitions
   */
  private performLevelTransitionOptimization(): void {
    // Clear non-essential objects
    this.particlePool.clear();
    
    // Optimize pools for new level
    this.optimizePools();
    
    this.emitMemoryEvent('optimization', 'Performed level transition optimization');
  }

  /**
   * Get PowerUp pool instance
   */
  public getPowerUpPool(): PowerUpPool {
    return this.powerUpPool;
  }

  /**
   * Get Particle pool instance
   */
  public getParticlePool(): ParticlePool {
    return this.particlePool;
  }

  /**
   * Get current memory statistics
   */
  public getStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * Get overall memory statistics (alias for getStats for backward compatibility)
   */
  public getOverallStats(): MemoryStats {
    return this.getStats();
  }

  /**
   * Get memory event history
   */
  public getEventHistory(): MemoryEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MemoryManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update pool configurations
    this.powerUpPool.updateConfig(this.config.powerUpPoolConfig);
    this.particlePool.updateConfig(this.config.particlePoolConfig);
    
    // Restart monitoring with new interval
    this.startMonitoring();
  }

  /**
   * Force full garbage collection
   */
  public forceFullGC(): void {
    this.powerUpPool.forceGC();
    this.particlePool.clear(); // Particle pool doesn't have forceGC yet
    this.performPreemptiveGC();
    
    this.emitMemoryEvent('gc', 'Performed full garbage collection');
  }

  /**
   * Get comprehensive debug information
   */
  public getDebugInfo(): string {
    const lines: string[] = [];
    lines.push('=== Memory Manager Debug Info ===');
    lines.push(`Total Memory: ${this.stats.totalMemoryMB.toFixed(2)} MB`);
    lines.push(`GC Pressure: ${(this.stats.gcPressure * 100).toFixed(1)}%`);
    lines.push(`Fragmentation: ${(this.stats.fragmentationRatio * 100).toFixed(1)}%`);
    lines.push(`Average Pool Utilization: ${(this.stats.averagePoolUtilization * 100).toFixed(1)}%`);
    lines.push(`Health Status: ${this.stats.isHealthy ? 'Healthy' : 'Issues Detected'}`);
    lines.push('');
    
    // Add pool debug info
    lines.push(this.powerUpPool.getDebugInfo());
    lines.push('');
    lines.push(this.particlePool.getDebugInfo());
    
    return lines.join('\n');
  }

  /**
   * Dispose of the memory manager
   */
  public dispose(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.powerUpPool.clear();
    this.particlePool.clear();
    this.eventHistory = [];
  }
}