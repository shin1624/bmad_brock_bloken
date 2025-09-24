#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

async function updateReadmeBadges() {
  try {
    // Read badges from coverage report
    const badgesPath = path.join('coverage', 'badges.json');
    const badgesData = await fs.readFile(badgesPath, 'utf8');
    const badges = JSON.parse(badgesData);
    
    // Read README
    const readmePath = 'README.md';
    let readme = await fs.readFile(readmePath, 'utf8');
    
    // Create badge section
    const badgeSection = `
## Test Coverage

![Coverage](${badges.overall})
![Statements](${badges.statements})
![Branches](${badges.branches})
![Functions](${badges.functions})
![Lines](${badges.lines})
`;
    
    // Check if badge section exists
    if (readme.includes('## Test Coverage')) {
      // Update existing section
      const regex = /## Test Coverage[\s\S]*?(?=##|$)/;
      readme = readme.replace(regex, badgeSection + '\n');
    } else {
      // Add new section after title
      const lines = readme.split('\n');
      const titleIndex = lines.findIndex(line => line.startsWith('#'));
      lines.splice(titleIndex + 2, 0, badgeSection);
      readme = lines.join('\n');
    }
    
    // Write updated README
    await fs.writeFile(readmePath, readme);
    
    console.log(chalk.green('✅ README badges updated successfully'));
    
  } catch (error) {
    console.error(chalk.red('❌ Error updating badges:'), error);
    process.exit(1);
  }
}

// Run
updateReadmeBadges();