#!/usr/bin/env node
/**
 * Synchronized version bump across all four package.json files.
 *
 * Usage: node scripts/version.mjs <patch|minor|major>
 *
 * Bumps the version field in all packages to the same new version,
 * commits the change, and creates a git tag v<new-version>.
 *
 * Prerequisites: working tree must be clean (no uncommitted changes).
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/version.mjs <patch|minor|major>');
  process.exit(1);
}

// Ensure working tree is clean
try {
  const status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
  if (status.trim()) {
    console.error('Working tree is not clean. Commit or stash changes before bumping version.');
    process.exit(1);
  }
} catch {
  console.error('Failed to check git status.');
  process.exit(1);
}

const packageFiles = [
  'package.json',
  'packages/api-grade-core/package.json',
  'packages/backstage-plugin-api-grade/package.json',
  'packages/backstage-plugin-api-grade-backend/package.json',
  'packages/api-grade-mcp/package.json',
];

// Read current version from root
const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const current = rootPkg.version;
const [major, minor, patch] = current.split('.').map(Number);

let newVersion;
if (bumpType === 'major') newVersion = `${major + 1}.0.0`;
else if (bumpType === 'minor') newVersion = `${major}.${minor + 1}.0`;
else newVersion = `${major}.${minor}.${patch + 1}`;

console.log(`Bumping ${current} → ${newVersion} (${bumpType})`);

for (const rel of packageFiles) {
  const pkgPath = resolve(root, rel);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  updated ${rel}`);
}

// Commit and tag
execSync(`git add ${packageFiles.join(' ')}`, { cwd: root, stdio: 'inherit' });
execSync(`git commit -m "chore: release v${newVersion}"`, { cwd: root, stdio: 'inherit' });
execSync(`git tag v${newVersion}`, { cwd: root, stdio: 'inherit' });

console.log(`\nVersion bumped to ${newVersion}. Push with:\n  git push && git push --tags`);
