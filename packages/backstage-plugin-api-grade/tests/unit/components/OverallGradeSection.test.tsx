import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(cleanup);
import React from 'react';
import { OverallGradeSection } from '../../../src/components/ApiGradeCard/OverallGradeSection.js';

describe('OverallGradeSection', () => {
  describe('summary mode', () => {
    it('renders the letter grade', () => {
      render(
        <OverallGradeSection
          letterGrade="B"
          numericScore={78}
          gradeLabel="Good"
          mode="summary"
        />,
      );
      expect(screen.getByLabelText('Grade B')).toBeTruthy();
    });

    it('renders percentage and label', () => {
      render(
        <OverallGradeSection
          letterGrade="B"
          numericScore={78}
          gradeLabel="Good"
          mode="summary"
        />,
      );
      expect(screen.getByText(/78%/)).toBeTruthy();
      expect(screen.getByText(/Good/)).toBeTruthy();
    });

    it('uses a horizontal (row) layout', () => {
      const { container } = render(
        <OverallGradeSection
          letterGrade="A"
          numericScore={100}
          gradeLabel="Excellent"
          mode="summary"
        />,
      );
      // children[0] = heading div, children[1] = inner flex row
      const innerRow = ((container.firstChild as HTMLElement).children[1]) as HTMLElement;
      expect(innerRow.style.flexDirection).not.toBe('column');
      expect(innerRow.style.display).toBe('flex');
    });
  });

  describe('detailed mode', () => {
    it('renders the letter grade', () => {
      render(
        <OverallGradeSection
          letterGrade="C"
          numericScore={62}
          gradeLabel="OK"
          mode="detailed"
        />,
      );
      expect(screen.getByLabelText('Grade C')).toBeTruthy();
    });

    it('renders percentage and label below the letter (column layout)', () => {
      const { container } = render(
        <OverallGradeSection
          letterGrade="C"
          numericScore={62}
          gradeLabel="OK"
          mode="detailed"
        />,
      );
      // children[0] = heading div, children[1] = inner flex column
      const innerCol = ((container.firstChild as HTMLElement).children[1]) as HTMLElement;
      expect(innerCol.style.flexDirection).toBe('column');
    });

    it('still shows percentage and label text', () => {
      render(
        <OverallGradeSection
          letterGrade="C"
          numericScore={62}
          gradeLabel="OK"
          mode="detailed"
        />,
      );
      expect(screen.getByText('62%')).toBeTruthy();
      expect(screen.getByText('OK')).toBeTruthy();
    });

    it('renders percentage and label as separate elements with no · separator', () => {
      const { container } = render(
        <OverallGradeSection
          letterGrade="C"
          numericScore={62}
          gradeLabel="OK"
          mode="detailed"
        />,
      );
      expect(container.textContent).not.toContain('·');
    });
  });
});
