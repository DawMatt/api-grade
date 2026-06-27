import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = join(__dirname, '..', 'src', 'rulesets', 'bundled-analysis');
const destDir = join(__dirname, '..', 'dist', 'rulesets', 'bundled-analysis');

mkdirSync(destDir, { recursive: true });
cpSync(srcDir, destDir, { recursive: true, filter: (src) => src.endsWith('.json') || !src.includes('.') });
