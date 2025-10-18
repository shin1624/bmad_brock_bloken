import {
  QualityLevel,
  QualitySettings,
  QUALITY_PRESETS,
  getQualitySettings,
  setQualitySettings,
  setQualityLevel,
} from '../../stores/qualitySettingsStore';

export class QualityManager {
  private fpsHistory: number[] = [];
  private lastAdjustTime: number = 0;
  private adjustCooldown: number = 5000; // 5 seconds in milliseconds
  private historySize: number = 60; // Track 1 second of FPS at 60fps
  private enabled: boolean = true;

  /**
   * Update the quality manager with current FPS
   * Should be called every frame from the game loop
   */
  public update(currentFPS: number, currentTime: number): void {
    const settings = getQualitySettings();

    // Only auto-adjust if enabled
    if (!settings.autoAdjust || !this.enabled) {
      return;
    }

    // Add current FPS to history
    this.fpsHistory.push(currentFPS);
    if (this.fpsHistory.length > this.historySize) {
      this.fpsHistory.shift();
    }

    // Wait for cooldown before adjusting again
    if (currentTime - this.lastAdjustTime < this.adjustCooldown) {
      return;
    }

    // Need sufficient history to make decisions
    if (this.fpsHistory.length < this.historySize) {
      return;
    }

    const avgFPS = this.calculateAverage(this.fpsHistory);

    // Downgrade if FPS too low (with 5 FPS buffer)
    if (avgFPS < settings.targetFPS - 5) {
      this.downgradeQuality(currentTime);
    }
    // Upgrade if FPS stable and high (with 10 FPS buffer)
    else if (avgFPS > settings.targetFPS + 10) {
      this.upgradeQuality(currentTime);
    }
  }

  /**
   * Calculate average FPS from history
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Downgrade quality level to improve performance
   */
  private downgradeQuality(currentTime: number): void {
    const current = getQualitySettings();

    let newLevel: QualityLevel | null = null;
    if (current.level === QualityLevel.HIGH) {
      newLevel = QualityLevel.MEDIUM;
    } else if (current.level === QualityLevel.MEDIUM) {
      newLevel = QualityLevel.LOW;
    }

    if (newLevel) {
      console.log(
        `[QualityManager] Downgrading quality: ${current.level} → ${newLevel}`
      );
      setQualityLevel(newLevel);
      this.lastAdjustTime = currentTime;
      this.fpsHistory = []; // Reset history after adjustment
    }
  }

  /**
   * Upgrade quality level when performance allows
   */
  private upgradeQuality(currentTime: number): void {
    const current = getQualitySettings();

    let newLevel: QualityLevel | null = null;
    if (current.level === QualityLevel.LOW) {
      newLevel = QualityLevel.MEDIUM;
    } else if (current.level === QualityLevel.MEDIUM) {
      newLevel = QualityLevel.HIGH;
    }

    if (newLevel) {
      console.log(
        `[QualityManager] Upgrading quality: ${current.level} → ${newLevel}`
      );
      setQualityLevel(newLevel);
      this.lastAdjustTime = currentTime;
      this.fpsHistory = []; // Reset history after adjustment
    }
  }

  /**
   * Enable or disable auto-adjustment
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.fpsHistory = [];
    }
  }

  /**
   * Get current quality settings
   */
  public getSettings(): QualitySettings {
    return getQualitySettings();
  }

  /**
   * Reset FPS history (useful after major state changes)
   */
  public resetHistory(): void {
    this.fpsHistory = [];
    this.lastAdjustTime = 0;
  }

  /**
   * Get current average FPS from history
   */
  public getCurrentAverageFPS(): number {
    return this.calculateAverage(this.fpsHistory);
  }
}
