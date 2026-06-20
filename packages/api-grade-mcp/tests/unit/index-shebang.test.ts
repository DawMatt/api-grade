import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const indexPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/index.ts');

describe('src/index.ts shebang', () => {
  it('starts with #!/usr/bin/env node so the npx bin entry runs as Node, not sh', () => {
    const firstLine = readFileSync(indexPath, 'utf-8').split('\n')[0];
    expect(firstLine).toBe('#!/usr/bin/env node');
  });
});
