#!/usr/bin/env node

/**
 * Generate Performance Report from E2E Test Results
 * Creates an HTML report with performance metrics and charts
 */

const fs = require('fs');
const path = require('path');

// Collect all performance metrics from test results
function collectPerformanceMetrics() {
  const metricsDir = 'test-results';
  const metrics = {
    fps: [],
    loadTime: [],
    memory: [],
    inputLatency: [],
    coreWebVitals: {
      fcp: [],
      lcp: [],
      cls: [],
      fid: []
    }
  };

  // Read all test result files
  if (fs.existsSync(metricsDir)) {
    const files = fs.readdirSync(metricsDir);
    
    files.forEach(file => {
      if (file.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(metricsDir, file), 'utf8'));
          
          // Extract performance metrics from test results
          if (data.performance) {
            if (data.performance.fps) metrics.fps.push(...data.performance.fps);
            if (data.performance.loadTime) metrics.loadTime.push(data.performance.loadTime);
            if (data.performance.memory) metrics.memory.push(...data.performance.memory);
            if (data.performance.inputLatency) metrics.inputLatency.push(...data.performance.inputLatency);
            
            if (data.performance.webVitals) {
              const vitals = data.performance.webVitals;
              if (vitals.fcp) metrics.coreWebVitals.fcp.push(vitals.fcp);
              if (vitals.lcp) metrics.coreWebVitals.lcp.push(vitals.lcp);
              if (vitals.cls) metrics.coreWebVitals.cls.push(vitals.cls);
              if (vitals.fid) metrics.coreWebVitals.fid.push(vitals.fid);
            }
          }
        } catch (e) {
          console.error(`Error parsing ${file}:`, e);
        }
      }
    });
  }

  return metrics;
}

// Calculate statistics for metrics
function calculateStats(values) {
  if (!values || values.length === 0) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  return {
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.floor(sorted.length * 0.95)]
  };
}

// Generate HTML report
function generateHTMLReport(metrics) {
  const fpsStats = calculateStats(metrics.fps);
  const loadTimeStats = calculateStats(metrics.loadTime);
  const memoryStats = calculateStats(metrics.memory);
  const latencyStats = calculateStats(metrics.inputLatency);
  
  const fcpStats = calculateStats(metrics.coreWebVitals.fcp);
  const lcpStats = calculateStats(metrics.coreWebVitals.lcp);
  const clsStats = calculateStats(metrics.coreWebVitals.cls);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 0.5rem;
    }
    .timestamp {
      color: #666;
      font-size: 0.9rem;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .metric-card {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .metric-title {
      font-size: 0.9rem;
      color: #666;
      margin-bottom: 0.5rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #333;
      margin-bottom: 1rem;
    }
    .metric-unit {
      font-size: 1rem;
      color: #999;
      font-weight: normal;
    }
    .metric-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #666;
      padding-top: 1rem;
      border-top: 1px solid #eee;
    }
    .status-good { color: #10b981; }
    .status-warning { color: #f59e0b; }
    .status-bad { color: #ef4444; }
    .chart-container {
      background: white;
      border-radius: 1rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .chart-title {
      font-size: 1.2rem;
      color: #333;
      margin-bottom: 1rem;
    }
    .bar-chart {
      display: flex;
      align-items: flex-end;
      height: 200px;
      gap: 1rem;
      padding: 1rem 0;
    }
    .bar {
      flex: 1;
      background: linear-gradient(to top, #667eea, #764ba2);
      border-radius: 0.5rem 0.5rem 0 0;
      position: relative;
      min-height: 10px;
    }
    .bar-label {
      position: absolute;
      bottom: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      color: #666;
      white-space: nowrap;
    }
    .bar-value {
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      font-weight: bold;
      color: #333;
    }
    .summary {
      background: white;
      border-radius: 1rem;
      padding: 2rem;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .summary-title {
      font-size: 1.5rem;
      color: #333;
      margin-bottom: 1rem;
    }
    .summary-list {
      list-style: none;
    }
    .summary-item {
      padding: 0.75rem 0;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .summary-item:last-child {
      border-bottom: none;
    }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 500;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-warning {
      background: #fed7aa;
      color: #92400e;
    }
    .badge-error {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎮 Block Breaker - Performance Test Report</h1>
      <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-title">Average FPS</div>
        <div class="metric-value ${fpsStats.avg >= 58 ? 'status-good' : fpsStats.avg >= 50 ? 'status-warning' : 'status-bad'}">
          ${fpsStats.avg.toFixed(1)}<span class="metric-unit">fps</span>
        </div>
        <div class="metric-details">
          <span>Min: ${fpsStats.min.toFixed(1)}</span>
          <span>P95: ${fpsStats.p95.toFixed(1)}</span>
          <span>Max: ${fpsStats.max.toFixed(1)}</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Page Load Time</div>
        <div class="metric-value ${loadTimeStats.avg <= 3000 ? 'status-good' : loadTimeStats.avg <= 5000 ? 'status-warning' : 'status-bad'}">
          ${(loadTimeStats.avg / 1000).toFixed(2)}<span class="metric-unit">s</span>
        </div>
        <div class="metric-details">
          <span>Min: ${(loadTimeStats.min / 1000).toFixed(2)}s</span>
          <span>P95: ${(loadTimeStats.p95 / 1000).toFixed(2)}s</span>
          <span>Max: ${(loadTimeStats.max / 1000).toFixed(2)}s</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Memory Usage</div>
        <div class="metric-value ${memoryStats.avg <= 150 ? 'status-good' : memoryStats.avg <= 200 ? 'status-warning' : 'status-bad'}">
          ${memoryStats.avg.toFixed(0)}<span class="metric-unit">MB</span>
        </div>
        <div class="metric-details">
          <span>Min: ${memoryStats.min.toFixed(0)}MB</span>
          <span>P95: ${memoryStats.p95.toFixed(0)}MB</span>
          <span>Max: ${memoryStats.max.toFixed(0)}MB</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-title">Input Latency</div>
        <div class="metric-value ${latencyStats.avg <= 16 ? 'status-good' : latencyStats.avg <= 33 ? 'status-warning' : 'status-bad'}">
          ${latencyStats.avg.toFixed(1)}<span class="metric-unit">ms</span>
        </div>
        <div class="metric-details">
          <span>Min: ${latencyStats.min.toFixed(1)}ms</span>
          <span>P95: ${latencyStats.p95.toFixed(1)}ms</span>
          <span>Max: ${latencyStats.max.toFixed(1)}ms</span>
        </div>
      </div>
    </div>

    <div class="chart-container">
      <h2 class="chart-title">Core Web Vitals</h2>
      <div class="bar-chart">
        <div class="bar" style="height: ${Math.min(fcpStats.avg / 10, 200)}px">
          <span class="bar-value">${fcpStats.avg.toFixed(0)}ms</span>
          <span class="bar-label">FCP</span>
        </div>
        <div class="bar" style="height: ${Math.min(lcpStats.avg / 15, 200)}px">
          <span class="bar-value">${lcpStats.avg.toFixed(0)}ms</span>
          <span class="bar-label">LCP</span>
        </div>
        <div class="bar" style="height: ${Math.min(clsStats.avg * 1000, 200)}px">
          <span class="bar-value">${clsStats.avg.toFixed(3)}</span>
          <span class="bar-label">CLS</span>
        </div>
      </div>
    </div>

    <div class="summary">
      <h2 class="summary-title">Performance Summary</h2>
      <ul class="summary-list">
        <li class="summary-item">
          <span>Frame Rate Target (60 FPS)</span>
          <span class="badge ${fpsStats.p95 >= 58 ? 'badge-success' : fpsStats.p95 >= 50 ? 'badge-warning' : 'badge-error'}">
            ${fpsStats.p95 >= 58 ? 'PASS' : fpsStats.p95 >= 50 ? 'WARNING' : 'FAIL'}
          </span>
        </li>
        <li class="summary-item">
          <span>Load Time Target (<3s)</span>
          <span class="badge ${loadTimeStats.avg <= 3000 ? 'badge-success' : loadTimeStats.avg <= 5000 ? 'badge-warning' : 'badge-error'}">
            ${loadTimeStats.avg <= 3000 ? 'PASS' : loadTimeStats.avg <= 5000 ? 'WARNING' : 'FAIL'}
          </span>
        </li>
        <li class="summary-item">
          <span>Memory Target (<200MB)</span>
          <span class="badge ${memoryStats.max <= 200 ? 'badge-success' : memoryStats.max <= 250 ? 'badge-warning' : 'badge-error'}">
            ${memoryStats.max <= 200 ? 'PASS' : memoryStats.max <= 250 ? 'WARNING' : 'FAIL'}
          </span>
        </li>
        <li class="summary-item">
          <span>Input Latency Target (<16ms)</span>
          <span class="badge ${latencyStats.avg <= 16 ? 'badge-success' : latencyStats.avg <= 33 ? 'badge-warning' : 'badge-error'}">
            ${latencyStats.avg <= 16 ? 'PASS' : latencyStats.avg <= 33 ? 'WARNING' : 'FAIL'}
          </span>
        </li>
      </ul>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

// Main execution
function main() {
  console.log('📊 Generating performance report...');
  
  const metrics = collectPerformanceMetrics();
  const report = generateHTMLReport(metrics);
  
  fs.writeFileSync('performance-report.html', report);
  console.log('✅ Performance report generated: performance-report.html');
  
  // Also generate JSON for further processing
  const jsonReport = {
    timestamp: new Date().toISOString(),
    metrics: {
      fps: calculateStats(metrics.fps),
      loadTime: calculateStats(metrics.loadTime),
      memory: calculateStats(metrics.memory),
      inputLatency: calculateStats(metrics.inputLatency),
      coreWebVitals: {
        fcp: calculateStats(metrics.coreWebVitals.fcp),
        lcp: calculateStats(metrics.coreWebVitals.lcp),
        cls: calculateStats(metrics.coreWebVitals.cls)
      }
    }
  };
  
  fs.writeFileSync('performance-metrics.json', JSON.stringify(jsonReport, null, 2));
  console.log('📋 Performance metrics JSON generated: performance-metrics.json');
}

main();