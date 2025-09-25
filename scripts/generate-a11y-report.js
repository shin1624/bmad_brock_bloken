#!/usr/bin/env node

/**
 * Generate Accessibility Report from E2E Test Results
 * Creates an HTML report with accessibility violations and recommendations
 */

const fs = require('fs');
const path = require('path');

// Collect all accessibility violations from test results
function collectA11yViolations() {
  const violations = [];
  const testResultsDir = 'test-results';

  if (fs.existsSync(testResultsDir)) {
    const files = fs.readdirSync(testResultsDir);
    
    files.forEach(file => {
      if (file.includes('accessibility') && file.endsWith('.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(testResultsDir, file), 'utf8'));
          
          if (data.violations) {
            violations.push(...data.violations);
          }
        } catch (e) {
          console.error(`Error parsing ${file}:`, e);
        }
      }
    });
  }

  return violations;
}

// Group violations by impact level
function groupViolationsByImpact(violations) {
  const grouped = {
    critical: [],
    serious: [],
    moderate: [],
    minor: []
  };

  violations.forEach(violation => {
    const impact = violation.impact || 'moderate';
    if (grouped[impact]) {
      grouped[impact].push(violation);
    }
  });

  return grouped;
}

// Generate HTML report
function generateHTMLReport(violations) {
  const grouped = groupViolationsByImpact(violations);
  const totalViolations = violations.length;
  const criticalCount = grouped.critical.length;
  const seriousCount = grouped.serious.length;
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Accessibility Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f9fafb;
      color: #333;
      line-height: 1.6;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      opacity: 0.9;
      font-size: 1.1rem;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: -3rem auto 2rem;
      max-width: 800px;
      position: relative;
    }
    .summary-card {
      background: white;
      border-radius: 0.75rem;
      padding: 1.5rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      text-align: center;
    }
    .summary-number {
      font-size: 3rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }
    .summary-label {
      color: #666;
      text-transform: uppercase;
      font-size: 0.85rem;
      letter-spacing: 0.5px;
    }
    .impact-critical { color: #dc2626; }
    .impact-serious { color: #ea580c; }
    .impact-moderate { color: #ca8a04; }
    .impact-minor { color: #65a30d; }
    .violations-section {
      margin: 2rem 0;
    }
    .impact-section {
      background: white;
      border-radius: 0.75rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .impact-header {
      padding: 1rem 1.5rem;
      font-weight: 600;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .impact-header.critical {
      background: #fee2e2;
      color: #991b1b;
    }
    .impact-header.serious {
      background: #fed7aa;
      color: #92400e;
    }
    .impact-header.moderate {
      background: #fef3c7;
      color: #78350f;
    }
    .impact-header.minor {
      background: #ecfccb;
      color: #365314;
    }
    .violation {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .violation:last-child {
      border-bottom: none;
    }
    .violation-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #1f2937;
    }
    .violation-description {
      color: #4b5563;
      margin-bottom: 1rem;
    }
    .violation-meta {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .meta-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #6b7280;
    }
    .meta-label {
      font-weight: 500;
    }
    .affected-elements {
      background: #f9fafb;
      border-radius: 0.5rem;
      padding: 1rem;
      margin-top: 1rem;
    }
    .affected-title {
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #374151;
      font-size: 0.9rem;
    }
    .element-list {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.85rem;
      color: #4b5563;
      line-height: 1.8;
    }
    .element-item {
      background: white;
      padding: 0.5rem;
      border-radius: 0.25rem;
      margin-bottom: 0.5rem;
      border: 1px solid #e5e7eb;
      word-break: break-all;
    }
    .fix-suggestion {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 1rem;
      margin-top: 1rem;
      border-radius: 0.25rem;
    }
    .fix-title {
      font-weight: 500;
      color: #1e40af;
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }
    .fix-content {
      color: #1e40af;
      font-size: 0.9rem;
    }
    .wcag-tags {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
    }
    .wcag-tag {
      background: #e5e7eb;
      color: #374151;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      font-size: 0.8rem;
    }
    .no-violations {
      background: #d1fae5;
      color: #065f46;
      padding: 2rem;
      border-radius: 0.75rem;
      text-align: center;
      font-size: 1.2rem;
      margin: 2rem 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      padding: 2rem;
      border-top: 1px solid #e5e7eb;
      margin-top: 3rem;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>♿ Accessibility Test Report</h1>
    <div class="subtitle">WCAG 2.1 AA Compliance Check</div>
  </div>

  <div class="container">
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-number">${totalViolations}</div>
        <div class="summary-label">Total Violations</div>
      </div>
      <div class="summary-card">
        <div class="summary-number impact-critical">${criticalCount}</div>
        <div class="summary-label">Critical</div>
      </div>
      <div class="summary-card">
        <div class="summary-number impact-serious">${seriousCount}</div>
        <div class="summary-label">Serious</div>
      </div>
      <div class="summary-card">
        <div class="summary-number impact-moderate">${grouped.moderate.length}</div>
        <div class="summary-label">Moderate</div>
      </div>
    </div>

    ${totalViolations === 0 ? `
      <div class="no-violations">
        ✅ Excellent! No accessibility violations found.
      </div>
    ` : `
      <div class="violations-section">
        ${renderViolationGroup('critical', grouped.critical)}
        ${renderViolationGroup('serious', grouped.serious)}
        ${renderViolationGroup('moderate', grouped.moderate)}
        ${renderViolationGroup('minor', grouped.minor)}
      </div>
    `}

    <div class="footer">
      <p>Generated: ${new Date().toLocaleString()}</p>
      <p>Powered by axe-core • WCAG 2.1 Level AA</p>
    </div>
  </div>
</body>
</html>
  `;

  return html;
}

function renderViolationGroup(impact, violations) {
  if (violations.length === 0) return '';

  const impactIcons = {
    critical: '🔴',
    serious: '🟠',
    moderate: '🟡',
    minor: '🟢'
  };

  return `
    <div class="impact-section">
      <div class="impact-header ${impact}">
        <span>${impactIcons[impact]}</span>
        <span>${impact.charAt(0).toUpperCase() + impact.slice(1)} Issues (${violations.length})</span>
      </div>
      ${violations.map(violation => `
        <div class="violation">
          <div class="violation-title">${violation.help}</div>
          <div class="violation-description">${violation.description}</div>
          
          <div class="violation-meta">
            <div class="meta-item">
              <span class="meta-label">Rule:</span>
              <span>${violation.id}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Elements:</span>
              <span>${violation.nodes ? violation.nodes.length : 0}</span>
            </div>
          </div>

          ${violation.tags ? `
            <div class="wcag-tags">
              ${violation.tags.map(tag => `<span class="wcag-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}

          ${violation.nodes && violation.nodes.length > 0 ? `
            <div class="affected-elements">
              <div class="affected-title">Affected Elements:</div>
              <div class="element-list">
                ${violation.nodes.slice(0, 3).map(node => `
                  <div class="element-item">${escapeHtml(node.html)}</div>
                `).join('')}
                ${violation.nodes.length > 3 ? `
                  <div class="element-item">... and ${violation.nodes.length - 3} more</div>
                ` : ''}
              </div>
            </div>
          ` : ''}

          ${violation.nodes && violation.nodes[0] && violation.nodes[0].failureSummary ? `
            <div class="fix-suggestion">
              <div class="fix-title">How to Fix:</div>
              <div class="fix-content">${violation.nodes[0].failureSummary}</div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Main execution
function main() {
  console.log('♿ Generating accessibility report...');
  
  const violations = collectA11yViolations();
  const report = generateHTMLReport(violations);
  
  fs.writeFileSync('a11y-report.html', report);
  console.log('✅ Accessibility report generated: a11y-report.html');
  
  // Save violations as JSON for CI processing
  fs.writeFileSync('a11y-violations.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    totalViolations: violations.length,
    violations: violations
  }, null, 2));
  console.log('📋 Violations JSON generated: a11y-violations.json');
  
  // Exit with error if critical violations found
  const criticalCount = violations.filter(v => v.impact === 'critical').length;
  if (criticalCount > 0) {
    console.error(`❌ Found ${criticalCount} critical accessibility violations!`);
    process.exit(1);
  }
}

main();