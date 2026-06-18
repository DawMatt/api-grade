#!/usr/bin/env node
/**
 * Restores workspace dependency references after npm publish.
 *
 * Reverts `"@dawmatt/api-grade-core": "^x.y.z"` back to
 * `"@dawmatt/api-grade-core": "*"` so Yarn workspaces resolves
 * the local package again during development.
 *
 * Run immediately after all npm publish commands complete.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const workspaces = [
  'packages/backstage-plugin-api-grade/package.json',
  'packages/backstage-plugin-api-grade-backend/package.json',
  'package.json',
];

for (const rel of workspaces) {
  const pkgPath = resolve(root, rel);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (
    pkg.dependencies?.['@dawmatt/api-grade-core'] &&
    pkg.dependencies['@dawmatt/api-grade-core'] !== '*'
  ) {
    pkg.dependencies['@dawmatt/api-grade-core'] = '*';
    console.log(`[post-publish] ${rel}: @dawmatt/api-grade-core → *`);
  }

  // Restore private:true on the root package
  if (rel === 'package.json' && !pkg.private) {
    pkg.private = true;
    console.log('[post-publish] package.json: restored private field');
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

console.log('[post-publish] done');
