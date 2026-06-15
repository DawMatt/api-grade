import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { GradingDetailSection } from '../../../src/components/ApiGradeCard/GradingDetailSection.js';
import type { DiagnosticSummary, Diagnostic } from 'api-grade-core';

afterEach(cleanup);

function makeSummary(overrides: Partial<DiagnosticSummary> = {}): DiagnosticSummary {
  return {
    tone: 'Needs Work',
    severityLevel: 'WARNING',
    errorCount: 0,
    warnCount: 3,
    infoCount: 0,
    hintCount: 0,
    commentary: 'Your API has several areas that need attention.',
    text: 'Your API has several areas that need attention.',
    focusRules: [],
    recommendations: ['Fix operation descriptions.', 'Add response schemas.'],
    ...overrides,
  };
}

function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    ruleId: 'operation-description',
    message: 'Operation must have a description.',
    severity: 'warn',
    path: ['paths', '/pets', 'get'],
    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
    source: 'inline',
    ...overrides,
  };
}

describe('GradingDetailSection', () => {
  it('renders Quality Assessment heading', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    expect(screen.getByText('Quality Assessment:')).toBeTruthy();
  });

  it('renders the commentary text', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    expect(screen.getByText(/areas that need attention/)).toBeTruthy();
  });

  it('renders Recommendations heading', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    expect(screen.getByText('Recommendations:')).toBeTruthy();
  });

  it('renders recommendations as an ordered list', () => {
    const { container } = render(
      <GradingDetailSection summary={makeSummary()} diagnostics={[]} />,
    );
    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const items = ol!.querySelectorAll('li');
    expect(items).toHaveLength(2);
  });

  it('preserves recommendation order', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    const items = screen.getAllByRole('listitem');
    // ol items only (ul diagnostic items not present when diagnostics=[])
    expect(items[0].textContent).toContain('Fix operation descriptions');
    expect(items[1].textContent).toContain('Add response schemas');
  });

  it('renders Diagnostics heading', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    expect(screen.getByText('Diagnostics:')).toBeTruthy();
  });

  it('renders "No diagnostics." when diagnostics array is empty', () => {
    render(<GradingDetailSection summary={makeSummary()} diagnostics={[]} />);
    expect(screen.getByText('No diagnostics.')).toBeTruthy();
  });

  it('renders diagnostic entries with ruleId and message', () => {
    render(
      <GradingDetailSection
        summary={makeSummary()}
        diagnostics={[makeDiagnostic()]}
      />,
    );
    expect(screen.getByText('operation-description', { exact: false })).toBeTruthy();
    expect(screen.getByText(/Operation must have a description/)).toBeTruthy();
  });

  it('renders severity label for each diagnostic', () => {
    render(
      <GradingDetailSection
        summary={makeSummary()}
        diagnostics={[makeDiagnostic({ severity: 'error' })]}
      />,
    );
    expect(screen.getByLabelText('severity error')).toBeTruthy();
  });

  it('renders three sections stacked vertically (column layout)', () => {
    const { container } = render(
      <GradingDetailSection summary={makeSummary()} diagnostics={[]} />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.flexDirection).toBe('column');
  });

  it('renders "No recommendations." when recommendations list is empty', () => {
    render(
      <GradingDetailSection
        summary={makeSummary({ recommendations: [] })}
        diagnostics={[]}
      />,
    );
    expect(screen.getByText('No recommendations.')).toBeTruthy();
  });

  it('renders path for a diagnostic entry', () => {
    render(
      <GradingDetailSection
        summary={makeSummary()}
        diagnostics={[makeDiagnostic({ path: ['paths', '/pets', 'get'] })]}
      />,
    );
    expect(screen.getByText(/paths\.\/pets\.get/)).toBeTruthy();
  });
});
