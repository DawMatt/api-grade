import spectralCore from '@stoplight/spectral-core';
import type { Document as SpectralDocument } from '@stoplight/spectral-core';
import parsers from '@stoplight/spectral-parsers';

const { Document } = spectralCore;
const { Yaml, Json } = parsers;

export function createAsyncApiDocument(content: string, filePath: string): SpectralDocument {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser: any = content.trimStart().startsWith('{') ? Json : Yaml;
  return new Document(content, parser, filePath) as unknown as SpectralDocument;
}
