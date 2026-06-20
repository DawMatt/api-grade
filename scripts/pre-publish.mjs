#!/usr/bin/env node
/**
 * Rewrites workspace dependency references before npm publish.
 *
 * Replaces `"@dawmatt/api-grade-core": "*"` with the exact version
 * being published (e.g. `"@dawmatt/api-grade-core": "^0.1.1"`) so
 * that consumers installing from npmjs get a real version pin.
 *
 * Run before publishing. Call post-publish.mjs afterwards to restore.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const rootPkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const version = rootPkg.version;

const workspaces = [
  'packages/backstage-plugin-api-grade/package.json',
  'packages/backstage-plugin-api-grade-backend/package.json',
  'packages/api-grade-mcp/package.json',
  // Root CLI package.json — also needs the dep rewrite AND private flag removal
  'package.json',
];

for (const rel of workspaces) {
  const pkgPath = resolve(root, rel);
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

  if (pkg.dependencies?.['@dawmatt/api-grade-core'] === '*') {
    pkg.dependencies['@dawmatt/api-grade-core'] = `^${version}`;
    console.log(`[pre-publish] ${rel}: @dawmatt/api-grade-core → ^${version}`);
  }

  // Root package has private:true for Yarn workspaces; remove before publishing
  if (rel === 'package.json' && pkg.private) {
    delete pkg.private;
    console.log('[pre-publish] package.json: removed private field');
  }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

console.log('[pre-publish] done');
