#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

const execAsync = promisify(exec);

class CoverageReporter {
  constructor() {
    this.coverageDir = 'coverage';
    this.thresholds = {
      statements: 90,
      branches: 85,
      functions: 80,
      lines: 90
    };
  }

  async generateReport() {
    console.log(chalk.blue('🔍 Generating coverage report...\n'));
    
    try {
      // Run tests with coverage
      const { stdout, stderr } = await execAsync('npm run test:coverage', {
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      // Parse coverage summary
      const coverage = await this.parseCoverageSummary();
      
      // Display results
      this.displayCoverageResults(coverage);
      
      // Check thresholds
      const passed = this.checkThresholds(coverage);
      
      // Generate badges
      await this.generateBadges(coverage);
      
      // Create detailed report
      await this.createDetailedReport(coverage);
      
      return passed;
      
    } catch (error) {
      console.error(chalk.red('❌ Error generating coverage report:'), error);
      return false;
    }
  }

  async parseCoverageSummary() {
    try {
      const summaryPath = path.join(this.coverageDir, 'coverage-summary.json');
      const summaryData = await fs.readFile(summaryPath, 'utf8');
      return JSON.parse(summaryData);
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Could not find coverage summary, using defaults'));
      return this.getDefaultCoverage();
    }
  }

  getDefaultCoverage() {
    return {
      total: {
        lines: { pct: 0, covered: 0, total: 0 },
        statements: { pct: 0, covered: 0, total: 0 },
        functions: { pct: 0, covered: 0, total: 0 },
        branches: { pct: 0, covered: 0, total: 0 }
      },
      byFile: {}
    };
  }

  displayCoverageResults(coverage) {
    console.log(chalk.bold('\n📊 Coverage Summary:\n'));
    
    const total = coverage.total;
    
    // Display each metric
    this.displayMetric('Statements', total.statements);
    this.displayMetric('Branches', total.branches);
    this.displayMetric('Functions', total.functions);
    this.displayMetric('Lines', total.lines);
    
    console.log('\n' + '─'.repeat(50) + '\n');
  }

  displayMetric(name, metric) {
    const pct = metric.pct || 0;
    const threshold = this.thresholds[name.toLowerCase()];
    const color = pct >= threshold ? chalk.green : pct >= threshold - 10 ? chalk.yellow : chalk.red;
    const icon = pct >= threshold ? '✅' : pct >= threshold - 10 ? '⚠️' : '❌';
    
    console.log(
      `${icon} ${name.padEnd(12)}: ${color(pct.toFixed(2) + '%')} ` +
      `(${metric.covered}/${metric.total}) ` +
      chalk.gray(`[threshold: ${threshold}%]`)
    );
  }

  checkThresholds(coverage) {
    const total = coverage.total;
    
    const results = {
      statements: total.statements.pct >= this.thresholds.statements,
      branches: total.branches.pct >= this.thresholds.branches,
      functions: total.functions.pct >= this.thresholds.functions,
      lines: total.lines.pct >= this.thresholds.lines
    };
    
    const allPassed = Object.values(results).every(r => r);
    
    if (allPassed) {
      console.log(chalk.green.bold('✨ All coverage thresholds met!'));
    } else {
      console.log(chalk.red.bold('⚠️  Some coverage thresholds not met'));
      
      for (const [key, passed] of Object.entries(results)) {
        if (!passed) {
          console.log(chalk.red(`  - ${key} below threshold`));
        }
      }
    }
    
    return allPassed;
  }

  async generateBadges(coverage) {
    console.log(chalk.blue('\n🎖️  Generating coverage badges...'));
    
    const total = coverage.total;
    const badges = {
      statements: this.createBadgeUrl('statements', total.statements.pct),
      branches: this.createBadgeUrl('branches', total.branches.pct),
      functions: this.createBadgeUrl('functions', total.functions.pct),
      lines: this.createBadgeUrl('lines', total.lines.pct),
      overall: this.createBadgeUrl('coverage', this.calculateOverall(total))
    };
    
    // Save badge URLs
    await fs.writeFile(
      path.join(this.coverageDir, 'badges.json'),
      JSON.stringify(badges, null, 2)
    );
    
    console.log(chalk.green('✅ Badges generated'));
    
    return badges;
  }

  createBadgeUrl(label, percentage) {
    const color = percentage >= 90 ? 'brightgreen' : 
                  percentage >= 80 ? 'green' :
                  percentage >= 70 ? 'yellow' :
                  percentage >= 60 ? 'orange' : 'red';
    
    return `https://img.shields.io/badge/${label}-${percentage.toFixed(1)}%25-${color}`;
  }

  calculateOverall(total) {
    const metrics = [
      total.statements.pct,
      total.branches.pct,
      total.functions.pct,
      total.lines.pct
    ];
    
    return metrics.reduce((acc, val) => acc + val, 0) / metrics.length;
  }

  async createDetailedReport(coverage) {
    console.log(chalk.blue('\n📝 Creating detailed report...'));
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: coverage.total,
      thresholds: this.thresholds,
      byModule: await this.analyzeByModule(coverage),
      uncoveredFiles: await this.findUncoveredFiles(coverage),
      improvements: this.suggestImprovements(coverage)
    };
    
    // Save detailed report
    await fs.writeFile(
      path.join(this.coverageDir, 'detailed-report.json'),
      JSON.stringify(report, null, 2)
    );
    
    // Create markdown report
    await this.createMarkdownReport(report);
    
    console.log(chalk.green('✅ Detailed report created'));
  }

  async analyzeByModule(coverage) {
    const modules = {};
    
    for (const [file, data] of Object.entries(coverage.byFile || {})) {
      const module = this.getModuleFromPath(file);
      
      if (!modules[module]) {
        modules[module] = {
          files: 0,
          lines: { covered: 0, total: 0 },
          statements: { covered: 0, total: 0 },
          functions: { covered: 0, total: 0 },
          branches: { covered: 0, total: 0 }
        };
      }
      
      modules[module].files++;
      
      // Aggregate metrics
      for (const metric of ['lines', 'statements', 'functions', 'branches']) {
        if (data[metric]) {
          modules[module][metric].covered += data[metric].covered || 0;
          modules[module][metric].total += data[metric].total || 0;
        }
      }
    }
    
    // Calculate percentages
    for (const module of Object.values(modules)) {
      for (const metric of ['lines', 'statements', 'functions', 'branches']) {
        if (module[metric].total > 0) {
          module[metric].pct = (module[metric].covered / module[metric].total) * 100;
        } else {
          module[metric].pct = 0;
        }
      }
    }
    
    return modules;
  }

  getModuleFromPath(filePath) {
    const parts = filePath.split('/');
    
    if (parts.includes('game')) return 'game';
    if (parts.includes('components')) return 'components';
    if (parts.includes('hooks')) return 'hooks';
    if (parts.includes('stores')) return 'stores';
    if (parts.includes('services')) return 'services';
    if (parts.includes('utils')) return 'utils';
    
    return 'other';
  }

  async findUncoveredFiles(coverage) {
    const coveredFiles = new Set(Object.keys(coverage.byFile || {}));
    const allFiles = await this.getAllSourceFiles();
    
    return allFiles.filter(file => !coveredFiles.has(file));
  }

  async getAllSourceFiles() {
    const srcDir = 'src';
    const files = [];
    
    async function walk(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.includes('test')) {
          await walk(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
          files.push(fullPath);
        }
      }
    }
    
    await walk(srcDir);
    return files;
  }

  suggestImprovements(coverage) {
    const suggestions = [];
    const total = coverage.total;
    
    if (total.branches.pct < this.thresholds.branches) {
      suggestions.push('Add tests for conditional branches and edge cases');
    }
    
    if (total.functions.pct < this.thresholds.functions) {
      suggestions.push('Increase function coverage by testing utility functions');
    }
    
    if (total.statements.pct < this.thresholds.statements) {
      suggestions.push('Cover more code paths and error handling');
    }
    
    if (total.lines.pct < this.thresholds.lines) {
      suggestions.push('Add tests for uncovered lines, especially error paths');
    }
    
    return suggestions;
  }

  async createMarkdownReport(report) {
    let markdown = '# Test Coverage Report\n\n';
    markdown += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    
    // Summary
    markdown += '## Summary\n\n';
    markdown += '| Metric | Coverage | Threshold | Status |\n';
    markdown += '|--------|----------|-----------|--------|\n';
    
    for (const [metric, data] of Object.entries(report.summary)) {
      const pct = data.pct || 0;
      const threshold = this.thresholds[metric];
      const status = pct >= threshold ? '✅' : '❌';
      
      markdown += `| ${metric} | ${pct.toFixed(2)}% | ${threshold}% | ${status} |\n`;
    }
    
    // By Module
    markdown += '\n## Coverage by Module\n\n';
    markdown += '| Module | Lines | Statements | Functions | Branches |\n';
    markdown += '|--------|-------|------------|-----------|----------|\n';
    
    for (const [module, data] of Object.entries(report.byModule)) {
      markdown += `| ${module} | ${data.lines.pct.toFixed(1)}% | `;
      markdown += `${data.statements.pct.toFixed(1)}% | `;
      markdown += `${data.functions.pct.toFixed(1)}% | `;
      markdown += `${data.branches.pct.toFixed(1)}% |\n`;
    }
    
    // Improvements
    if (report.improvements.length > 0) {
      markdown += '\n## Suggested Improvements\n\n';
      for (const suggestion of report.improvements) {
        markdown += `- ${suggestion}\n`;
      }
    }
    
    // Uncovered Files
    if (report.uncoveredFiles.length > 0) {
      markdown += '\n## Files with No Coverage\n\n';
      for (const file of report.uncoveredFiles.slice(0, 10)) {
        markdown += `- ${file}\n`;
      }
      
      if (report.uncoveredFiles.length > 10) {
        markdown += `\n...and ${report.uncoveredFiles.length - 10} more files\n`;
      }
    }
    
    await fs.writeFile(
      path.join(this.coverageDir, 'COVERAGE.md'),
      markdown
    );
  }
}

// Main execution
async function main() {
  const reporter = new CoverageReporter();
  const success = await reporter.generateReport();
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
}

export { CoverageReporter };