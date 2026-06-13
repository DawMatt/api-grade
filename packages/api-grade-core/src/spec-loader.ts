import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ApiSpecification, ApiFormat } from './types.js';

export async function loadSpec(filePath: string): Promise<ApiSpecification> {
  const absolutePath = resolve(filePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  const rawContent = await readFile(absolutePath, 'utf-8');
  if (!rawContent.trim()) {
    throw new Error(`File is empty: ${filePath}`);
  }
  const format = detectFormat(rawContent);
  if (!format) {
    throw new Error(
      `Could not detect API format. File must be a valid OpenAPI 2/3 or AsyncAPI 2/3 specification: ${filePath}`
    );
  }
  return { filePath: absolutePath, format, rawContent };
}

export function detectFormat(content: string): ApiFormat | null {
  const sample = content.slice(0, 3000);
  if (/^\s*swagger\s*:\s*['"]?2\./m.test(sample)) return 'openapi-2';
  if (/^\s*openapi\s*:\s*['"]?3\./m.test(sample)) return 'openapi-3';
  if (/^\s*asyncapi\s*:\s*['"]?2\./m.test(sample)) return 'asyncapi-2';
  if (/^\s*asyncapi\s*:\s*['"]?3\./m.test(sample)) return 'asyncapi-3';
  // JSON format
  if (/["']swagger["']\s*:\s*["']2\./.test(sample)) return 'openapi-2';
  if (/["']openapi["']\s*:\s*["']3\./.test(sample)) return 'openapi-3';
  if (/["']asyncapi["']\s*:\s*["']2\./.test(sample)) return 'asyncapi-2';
  if (/["']asyncapi["']\s*:\s*["']3\./.test(sample)) return 'asyncapi-3';
  return null;
}
