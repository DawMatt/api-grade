import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

// Mock Backstage peer dependencies (not installed in test environment)
vi.mock('@backstage/core-plugin-api', () => ({
  useApi: vi.fn().mockReturnValue({}),
  discoveryApiRef: Symbol('discoveryApiRef'),
  fetchApiRef: Symbol('fetchApiRef'),
}));

vi.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: vi.fn().mockReturnValue({
    entity: {
      kind: 'API',
      metadata: { name: 'test-api', namespace: 'default' },
      spec: { type: 'graphql', definition: '' },
    },
  }),
}));

vi.mock('@backstage/core-components', () => ({
  InfoCard: ({ title, children }: { title: string; children: React.ReactNode }) =>
    React.createElement(
      'div',
      { 'data-testid': 'info-card' },
      React.createElement('h2', null, title),
      children,
    ),
}));

// Mock relative module paths as resolved from the test file location.
// The component imports '../../hooks/useApiGrade.js' (relative to src/components/ApiGradeCard/)
// which resolves to the same file as '../../../src/hooks/useApiGrade.js' from here.
vi.mock('../../../src/hooks/useApiGrade.js', () => ({
  useApiGrade: vi.fn(),
}));

vi.mock('../../../src/api/ApiGradeClient.js', () => ({
  ApiGradeClient: vi.fn().mockImplementation(() => ({})),
}));

import { useApiGrade } from '../../../src/hooks/useApiGrade.js';
import { ApiGradeCard } from '../../../src/components/ApiGradeCard/ApiGradeCard.js';

const mockUseApiGrade = vi.mocked(useApiGrade);

afterEach(cleanup);

describe('ApiGradeCard — FR-015 unsupported-format error state', () => {
  it('renders a user-friendly unavailability message for unsupported formats', () => {
    mockUseApiGrade.mockReturnValue({
      loading: false,
      grade: null,
      error: 'This API uses graphql, which is not currently supported for quality grading. Supported formats: OpenAPI 2/3, AsyncAPI 2/3.',
      rulesetWarning: null,
    });

    render(<ApiGradeCard />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('API grade unavailable')).toBeTruthy();
    expect(screen.getByText(/not currently supported/)).toBeTruthy();
  });

  it('does not throw or render a blank card for unsupported formats', () => {
    mockUseApiGrade.mockReturnValue({
      loading: false,
      grade: null,
      error: 'This API uses graphql, which is not currently supported for quality grading. Supported formats: OpenAPI 2/3, AsyncAPI 2/3.',
      rulesetWarning: null,
    });

    const { container } = render(<ApiGradeCard />);

    // Card renders content (not blank)
    expect(container.innerHTML.length).toBeGreaterThan(0);
    // No uncaught error thrown (test would fail if render threw)
  });

  it('renders loading state while fetching', () => {
    mockUseApiGrade.mockReturnValue({
      loading: true,
      grade: null,
      error: null,
      rulesetWarning: null,
    });

    render(<ApiGradeCard />);

    expect(screen.getByLabelText('Loading API grade')).toBeTruthy();
  });

  it('renders grade summary when grading succeeds', () => {
    mockUseApiGrade.mockReturnValue({
      loading: false,
      grade: {
        specPath: 'inline',
        format: 'openapi-3',
        letterGrade: 'B',
        gradeLabel: 'Good',
        numericScore: 78,
        summary: {
          tone: 'Good',
          severityLevel: 'WARNING',
          errorCount: 0,
          warnCount: 3,
          infoCount: 0,
          hintCount: 0,
          commentary: '',
          text: '',
          focusRules: [],
          recommendations: [],
        },
        diagnostics: [],
        rulesetSource: 'default',
        rulesetPath: 'default',
      },
      error: null,
      rulesetWarning: null,
    });

    render(<ApiGradeCard />);

    expect(screen.getByLabelText('Grade B')).toBeTruthy();
  });
});
