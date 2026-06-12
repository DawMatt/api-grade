import { Document } from '@stoplight/spectral-core';
import { Yaml, Json } from '@stoplight/spectral-parsers';

export function createAsyncApiDocument(content: string, filePath: string): Document {
  const parser = content.trimStart().startsWith('{') ? Json : Yaml;
  return new Document(content, parser, filePath);
}
