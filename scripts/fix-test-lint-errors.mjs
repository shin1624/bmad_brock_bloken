#!/usr/bin/env node

/**
 * Script to automatically fix common lint errors in test files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all test files
const testFiles = await glob('src/**/*.test.{ts,tsx}', {
  cwd: path.join(__dirname, '..'),
  absolute: true
});

console.log(`Found ${testFiles.length} test files to process`);

let totalFixed = 0;

for (const file of testFiles) {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  let fixes = 0;

  // Fix 1: Replace (someVar as any) with proper type assertions for mocks
  content = content.replace(/\((\w+) as any\)\.mockReturnValue/g, '($1 as ReturnType<typeof vi.fn>).mockReturnValue');
  content = content.replace(/\((\w+) as any\)\.mockImplementation/g, '($1 as ReturnType<typeof vi.fn>).mockImplementation');
  content = content.replace(/\((\w+) as any\)\.mockResolvedValue/g, '($1 as ReturnType<typeof vi.fn>).mockResolvedValue');

  // Fix 2: Replace global.ResizeObserver = ... as any
  content = content.replace(/global\.ResizeObserver = (.*?) as any/g, 'global.ResizeObserver = $1 as typeof ResizeObserver');

  // Fix 3: Remove unused fireEvent import
  if (content.includes('import') && content.includes('fireEvent') && content.includes('@testing-library/react')) {
    const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']@testing-library\/react["']/);
    if (importMatch) {
      const imports = importMatch[1];
      const restOfFile = content.substring(content.indexOf(importMatch[0]) + importMatch[0].length);

      if (!restOfFile.includes('fireEvent')) {
        // Remove fireEvent from imports
        const newImports = imports.split(',')
          .map(i => i.trim())
          .filter(i => !i.startsWith('fireEvent'))
          .join(', ');

        content = content.replace(importMatch[0], `import { ${newImports} } from "@testing-library/react"`);
        fixes++;
      }
    }
  }

  // Fix 4: Remove unused vi import
  if (content.includes('import') && content.includes('vi') && content.includes('vitest')) {
    const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']vitest["']/);
    if (importMatch) {
      const imports = importMatch[1];
      const restOfFile = content.substring(content.indexOf(importMatch[0]) + importMatch[0].length);

      // Check if vi is actually used (not just in vi.fn, vi.mock etc)
      if (!restOfFile.includes('vi.')) {
        // Remove vi from imports
        const newImports = imports.split(',')
          .map(i => i.trim())
          .filter(i => i !== 'vi')
          .join(', ');

        if (newImports) {
          content = content.replace(importMatch[0], `import { ${newImports} } from "vitest"`);
        }
        fixes++;
      }
    }
  }

  // Fix 5: Replace let x: any with proper types
  content = content.replace(/let (\w+): any = null/g, 'let $1: unknown = null');
  content = content.replace(/let (\w+): any;/g, 'let $1: unknown;');

  // Fix 6: Fix specific mock patterns
  content = content.replace(/as any\)\.id/g, '.id');

  // Count fixes and write if changed
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`✓ Fixed ${path.basename(file)}`);
    totalFixed++;
  }
}

console.log(`\n✅ Fixed ${totalFixed} test files`);
