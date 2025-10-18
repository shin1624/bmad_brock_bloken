/**
 * Performance Benchmark Utility
 * Story 4.3b - BLOCKER #3 Resolution
 * Automated benchmark testing for Story 4.3b acceptance criteria
 */

import {
  GamePerformanceMonitor,
  PerformanceBenchmarkResult,
} from './GamePerformanceMonitor';

export interface BenchmarkScenario {
  name: string;
  description: string;
  powerUpCount: number;
  ballCount: number;
  blockCount: number;
  particleCount: number;
  projectileCount?: number;
  targetFPS: number;
  maxMemoryMB: number;
  durationMs: number;
}

export interface BenchmarkReport {
  scenario: BenchmarkScenario;
  result: PerformanceBenchmarkResult;
  passed: boolean;
  summary: string;
}

/**
 * Story 4.3b Benchmark Scenarios
 */
export const STORY_4_3B_SCENARIOS: BenchmarkScenario[] = [
  {
    name: 'AC12: 3 Power-ups Active',
    description: '55 FPS with any 3 power-ups active simultaneously',
    powerUpCount: 3,
    ballCount: 2,
    blockCount: 50,
    particleCount: 100,
    projectileCount: 10,
    targetFPS: 55,
    maxMemoryMB: 250,
    durationMs: 10000, // 10 seconds
  },
  {
    name: 'AC13: 5 Power-ups Active',
    description: '50 FPS with all 5 advanced power-ups active',
    powerUpCount: 5,
    ballCount: 3,
    blockCount: 50,
    particleCount: 150,
    projectileCount: 15,
    targetFPS: 50,
    maxMemoryMB: 250,
    durationMs: 10000,
  },
  {
    name: 'Baseline: No Power-ups',
    description: '60 FPS baseline with no power-ups',
    powerUpCount: 0,
    ballCount: 1,
    blockCount: 50,
    particleCount: 50,
    targetFPS: 60,
    maxMemoryMB: 200,
    durationMs: 5000,
  },
  {
    name: 'Stress Test: Maximum Load',
    description: 'Maximum entities stress test',
    powerUpCount: 5,
    ballCount: 5,
    blockCount: 100,
    particleCount: 200,
    projectileCount: 20,
    targetFPS: 45,
    maxMemoryMB: 250,
    durationMs: 15000,
  },
];

/**
 * Performance Benchmark Runner
 */
export class PerformanceBenchmark {
  private monitor: GamePerformanceMonitor;
  private scenarios: BenchmarkScenario[];

  constructor(
    monitor: GamePerformanceMonitor,
    scenarios: BenchmarkScenario[] = STORY_4_3B_SCENARIOS
  ) {
    this.monitor = monitor;
    this.scenarios = scenarios;
  }

  /**
   * Run a single benchmark scenario
   */
  async runScenario(
    scenario: BenchmarkScenario,
    setupCallback: (scenario: BenchmarkScenario) => Promise<void>,
    teardownCallback: () => Promise<void>
  ): Promise<BenchmarkReport> {
    console.log(`\n🔬 Running Benchmark: ${scenario.name}`);
    console.log(`   ${scenario.description}`);
    console.log(`   Duration: ${scenario.durationMs / 1000}s`);

    // Update monitor thresholds for this scenario
    this.monitor.updateThresholds({
      minFPS: scenario.targetFPS,
      maxMemoryMB: scenario.maxMemoryMB,
    });

    // Setup scenario
    await setupCallback(scenario);

    // Start benchmark
    this.monitor.startBenchmark(scenario.durationMs);
    this.monitor.start();

    // Wait for benchmark duration
    await new Promise((resolve) => setTimeout(resolve, scenario.durationMs));

    // Stop and get results
    this.monitor.stop();
    const result = this.monitor.stopBenchmark();

    // Teardown
    await teardownCallback();

    // Generate report
    const passed = result.passed && result.averageFPS >= scenario.targetFPS;
    const summary = this.generateSummary(scenario, result, passed);

    console.log(summary);

    return {
      scenario,
      result,
      passed,
      summary,
    };
  }

  /**
   * Run all benchmark scenarios
   */
  async runAll(
    setupCallback: (scenario: BenchmarkScenario) => Promise<void>,
    teardownCallback: () => Promise<void>
  ): Promise<BenchmarkReport[]> {
    const reports: BenchmarkReport[] = [];

    console.log('\n═══════════════════════════════════════════════');
    console.log('   STORY 4.3B PERFORMANCE BENCHMARK SUITE');
    console.log('═══════════════════════════════════════════════\n');

    for (const scenario of this.scenarios) {
      const report = await this.runScenario(
        scenario,
        setupCallback,
        teardownCallback
      );
      reports.push(report);

      // Wait between scenarios
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Print overall summary
    this.printOverallSummary(reports);

    return reports;
  }

  /**
   * Generate summary for a single benchmark
   */
  private generateSummary(
    scenario: BenchmarkScenario,
    result: PerformanceBenchmarkResult,
    passed: boolean
  ): string {
    const lines: string[] = [];

    lines.push('\n   Results:');
    lines.push(`   ├─ Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    lines.push(`   ├─ Average FPS: ${result.averageFPS.toFixed(1)} (target: ${scenario.targetFPS})`);
    lines.push(`   ├─ Min FPS: ${result.minFPS.toFixed(1)}`);
    lines.push(`   ├─ Max FPS: ${result.maxFPS.toFixed(1)}`);
    lines.push(`   ├─ Memory: ${result.metrics.memoryUsage}MB (max: ${scenario.maxMemoryMB}MB)`);
    lines.push(`   ├─ Frame Time: ${result.metrics.frameTime.toFixed(2)}ms`);
    lines.push(`   ├─ Render Time: ${result.metrics.renderTime.toFixed(2)}ms`);
    lines.push(`   ├─ Update Time: ${result.metrics.updateTime.toFixed(2)}ms`);
    lines.push(`   ├─ Dropped Frames: ${result.metrics.droppedFrames}`);
    lines.push(`   └─ Entities: ${result.metrics.activePowerUps}PU, ${result.metrics.activeBalls}B, ${result.metrics.activeParticles}P`);

    if (result.violations.length > 0) {
      lines.push('\n   ⚠️  Violations:');
      result.violations.forEach((violation) => {
        lines.push(`   └─ ${violation}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Print overall summary
   */
  private printOverallSummary(reports: BenchmarkReport[]): void {
    console.log('\n═══════════════════════════════════════════════');
    console.log('   BENCHMARK SUMMARY');
    console.log('═══════════════════════════════════════════════\n');

    const totalScenarios = reports.length;
    const passedScenarios = reports.filter((r) => r.passed).length;
    const failedScenarios = totalScenarios - passedScenarios;

    console.log(`   Total Scenarios: ${totalScenarios}`);
    console.log(`   ✅ Passed: ${passedScenarios}`);
    console.log(`   ❌ Failed: ${failedScenarios}`);
    console.log(`   Success Rate: ${((passedScenarios / totalScenarios) * 100).toFixed(1)}%`);

    console.log('\n   Scenario Results:');
    reports.forEach((report, index) => {
      const status = report.passed ? '✅' : '❌';
      const fps = report.result.averageFPS.toFixed(1);
      const target = report.scenario.targetFPS;
      console.log(
        `   ${index + 1}. ${status} ${report.scenario.name} - ${fps}/${target} FPS`
      );
    });

    // Story 4.3b specific validation
    const ac12Report = reports.find((r) =>
      r.scenario.name.includes('AC12')
    );
    const ac13Report = reports.find((r) =>
      r.scenario.name.includes('AC13')
    );

    console.log('\n   Story 4.3b Acceptance Criteria:');
    if (ac12Report) {
      console.log(
        `   AC12 (3 Power-ups): ${ac12Report.passed ? '✅ MET' : '❌ NOT MET'} - ${ac12Report.result.averageFPS.toFixed(1)} FPS`
      );
    }
    if (ac13Report) {
      console.log(
        `   AC13 (5 Power-ups): ${ac13Report.passed ? '✅ MET' : '❌ NOT MET'} - ${ac13Report.result.averageFPS.toFixed(1)} FPS`
      );
    }

    const allAcPassed =
      ac12Report?.passed &&
      ac13Report?.passed &&
      reports.every((r) => r.result.metrics.memoryUsage <= 250);

    console.log(
      `\n   Overall Story 4.3b Compliance: ${allAcPassed ? '✅ READY FOR APPROVAL' : '❌ NEEDS OPTIMIZATION'}`
    );
    console.log('\n═══════════════════════════════════════════════\n');
  }

  /**
   * Quick benchmark (shorter duration for rapid testing)
   */
  async runQuick(
    setupCallback: (scenario: BenchmarkScenario) => Promise<void>,
    teardownCallback: () => Promise<void>
  ): Promise<BenchmarkReport[]> {
    const quickScenarios = this.scenarios.map((s) => ({
      ...s,
      durationMs: 3000, // 3 seconds
    }));

    const benchmark = new PerformanceBenchmark(this.monitor, quickScenarios);
    return benchmark.runAll(setupCallback, teardownCallback);
  }
}

/**
 * Create and export benchmark instance
 */
export function createBenchmark(
  monitor: GamePerformanceMonitor
): PerformanceBenchmark {
  return new PerformanceBenchmark(monitor);
}
