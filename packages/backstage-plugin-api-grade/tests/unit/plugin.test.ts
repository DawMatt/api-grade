import { describe, it, expect, vi } from 'vitest';

vi.mock('@backstage/core-plugin-api', () => ({
  createPlugin: vi.fn().mockImplementation(({ id }: { id: string }) => ({
    getId: () => id,
  })),
  useApi: vi.fn(),
  discoveryApiRef: Symbol('discoveryApiRef'),
  fetchApiRef: Symbol('fetchApiRef'),
}));

vi.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: vi.fn(),
}));

vi.mock('@backstage/core-components', () => ({
  InfoCard: vi.fn(),
}));

vi.mock('@dawmatt/backstage-plugin-api-grade-backend', () => ({}));

describe('package exports', () => {
  it('exports apiGradePlugin with the expected id', async () => {
    const { apiGradePlugin } = await import('../../src/index.js');
    expect(apiGradePlugin).toBeDefined();
    expect(apiGradePlugin.getId()).toBe('api-grade');
  });

  it('exports ApiGradeCard as a function', async () => {
    const { ApiGradeCard } = await import('../../src/index.js');
    expect(typeof ApiGradeCard).toBe('function');
  });

  it('exports ApiGradeClient as a class', async () => {
    const { ApiGradeClient } = await import('../../src/index.js');
    expect(typeof ApiGradeClient).toBe('function');
  });

  it('exports useApiGrade as a function', async () => {
    const { useApiGrade } = await import('../../src/index.js');
    expect(typeof useApiGrade).toBe('function');
  });
});
