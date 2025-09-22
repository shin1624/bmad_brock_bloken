#!/usr/bin/env node

/**
 * Script to automatically fix common lint errors in test files
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${testFiles.length} test files to process`);

let totalFixed = 0;

testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  let fixes = 0;

  // Fix 1: Replace (someVar as any) with proper type assertions for mocks
  content = content.replace(/\((\w+) as any\)\.mockReturnValue/g, '($1 as ReturnType<typeof vi.fn>).mockReturnValue');
  content = content.replace(/\((\w+) as any\)\.mockImplementation/g, '($1 as ReturnType<typeof vi.fn>).mockImplementation');
  content = content.replace(/\((\w+) as any\)\.mockResolvedValue/g, '($1 as ReturnType<typeof vi.fn>).mockResolvedValue');

  // Fix 2: Replace window as any
  if (content.includes('(window as any)')) {
    // Check if GameStateManager is used
    if (content.includes('gameStateManager')) {
      // Add type declaration if not present
      if (!content.includes('declare global')) {
        const importEnd = content.lastIndexOf('import');
        const importEndLine = content.indexOf('\n', importEnd) + 1;

        const typeDeclaration = `
declare global {
  interface Window {
    gameStateManager?: any;
  }
}
`;
        content = content.substring(0, importEndLine) + typeDeclaration + content.substring(importEndLine);
      }

      // Replace (window as any) with window
      content = content.replace(/\(window as any\)/g, 'window');
    }
  }

  // Fix 3: Replace global.ResizeObserver = ... as any
  content = content.replace(/global\.ResizeObserver = (.*?) as any/g, 'global.ResizeObserver = $1 as typeof ResizeObserver');

  // Fix 4: Fix unused imports - common ones
  const unusedPatterns = [
    { pattern: /import.*\{ fireEvent.*\}.*from.*testing-library/, check: 'fireEvent' },
    { pattern: /import.*\{ vi.*\}.*from.*vitest/, check: 'vi' },
    { pattern: /import.*\{ PowerUpType.*\}.*from/, check: 'PowerUpType' },
  ];

  unusedPatterns.forEach(({ pattern, check }) => {
    if (content.match(pattern)) {
      // Check if the import is actually used
      const importLine = content.match(pattern)[0];
      const restOfFile = content.substring(content.indexOf(importLine) + importLine.length);

      // Simple check - if the word doesn't appear again after import
      if (!restOfFile.includes(check + '.') &&
          !restOfFile.includes(check + '(') &&
          !restOfFile.includes(check + '[') &&
          !restOfFile.includes(check + ',') &&
          !restOfFile.includes(check + '}') &&
          !restOfFile.includes('<' + check)) {

        // Remove the specific import
        if (importLine.includes(',')) {
          content = content.replace(new RegExp(`,\\s*${check}|${check}\\s*,`, 'g'), '');
        } else {
          // If it's the only import, comment out the line
          content = content.replace(importLine, '// ' + importLine);
        }
        fixes++;
      }
    }
  });

  // Fix 5: Add underscore prefix to unused parameters in test callbacks
  content = content.replace(/\(\s*(\w+)\s*:\s*\{[^}]+\}\s*\)\s*=>\s*\{/g, (match, param) => {
    // Check if parameter is used in the function body
    const funcStart = content.indexOf(match);
    const funcEnd = content.indexOf('}', funcStart);
    const funcBody = content.substring(funcStart + match.length, funcEnd);

    if (!funcBody.includes(param)) {
      return match.replace(param, '_' + param);
    }
    return match;
  });

  // Fix 6: Replace : any with : unknown for safer types
  content = content.replace(/let (\w+): any = /g, 'let $1: unknown = ');
  content = content.replace(/const (\w+): any = /g, 'const $1: unknown = ');

  // Count fixes
  if (content !== originalContent) {
    fixes = 1; // Simple count for now
    fs.writeFileSync(file, content);
    console.log(`✓ Fixed ${path.basename(file)}`);
    totalFixed++;
  }
});

console.log(`\n✅ Fixed ${totalFixed} test files`);
