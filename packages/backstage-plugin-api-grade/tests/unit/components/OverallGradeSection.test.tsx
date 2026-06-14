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
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.flexDirection).not.toBe('column');
      expect(wrapper.style.display).toBe('flex');
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
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.flexDirection).toBe('column');
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
      expect(screen.getByText(/62%/)).toBeTruthy();
      expect(screen.getByText(/OK/)).toBeTruthy();
    });
  });
});
