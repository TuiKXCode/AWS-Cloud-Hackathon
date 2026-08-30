// src/components/__tests__/ProgressBar.test.tsx
// Feature: questline-progress — unit tests for the ProgressBar component.
//
// Covers:
//  - Renders a role="progressbar" with aria-valuenow rounded from the
//    provider's Progress_Ratio, plus aria-valuemin/max bounds (Req 1.1, 1.3).
//  - Renders the "{playerTotal} / {totalPointsToComplete}" text (Req 1.1).
//  - When the provider's Progress_Ratio changes on rerender, aria-valuenow and
//    the fill width update without a remount (Req 1.2).
//  - A clamped Progress_Ratio of 100 renders as a full bar (Req 1.4).
//
// useQuestline() is mocked via a mutable holder so each test controls the
// values the component consumes without a real provider or Phase 4 context.

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuestlineContextValue } from '../../context/QuestlineContext';

const mock = vi.hoisted(() => ({
  value: null as QuestlineContextValue | null,
}));

vi.mock('../../context/QuestlineContext', () => ({
  useQuestline: () => mock.value,
}));

// Imported after the mock is registered.
import { ProgressBar } from '../ProgressBar';

function makeValue(
  overrides: Partial<QuestlineContextValue>,
): QuestlineContextValue {
  return {
    playerTotal: 0,
    totalPointsToComplete: 100,
    progressRatio: 0,
    isComplete: false,
    showVoucher: false,
    prizeLabel: 'Prize',
    voucherCode: null,
    redeemed: false,
    markRedeemed: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mock.value = makeValue({});
});

afterEach(() => {
  cleanup();
});

describe('ProgressBar', () => {
  it('renders a progressbar with rounded aria-valuenow and bounds (Req 1.1, 1.3)', () => {
    mock.value = makeValue({ playerTotal: 42, progressRatio: 42.6 });
    render(<ProgressBar />);

    const bar = screen.getByRole('progressbar', { name: 'Questline progress' });
    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders the playerTotal / totalPointsToComplete text (Req 1.1)', () => {
    mock.value = makeValue({ playerTotal: 30, totalPointsToComplete: 100 });
    render(<ProgressBar />);

    expect(screen.getByText('30 / 100')).toBeInTheDocument();
  });

  it('sets the fill width to the progressRatio percentage (Req 1.3)', () => {
    mock.value = makeValue({ playerTotal: 25, progressRatio: 25 });
    render(<ProgressBar />);

    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('25%');
  });

  it('updates aria-valuenow and fill width on rerender without remount (Req 1.2)', () => {
    mock.value = makeValue({ playerTotal: 20, progressRatio: 20 });
    const { rerender } = render(<ProgressBar />);

    let bar = screen.getByRole('progressbar');
    const initialBar = bar;
    expect(bar).toHaveAttribute('aria-valuenow', '20');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('20%');

    // Simulate playerTotal increasing (new animal collected) → new ratio.
    mock.value = makeValue({ playerTotal: 60, progressRatio: 60 });
    rerender(<ProgressBar />);

    bar = screen.getByRole('progressbar');
    // Same DOM node — the update was a re-render, not a remount (Req 1.2).
    expect(bar).toBe(initialBar);
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('60%');
    expect(screen.getByText('60 / 100')).toBeInTheDocument();
  });

  it('renders a full bar when progressRatio is clamped to 100 (Req 1.4)', () => {
    mock.value = makeValue({
      playerTotal: 150,
      totalPointsToComplete: 100,
      progressRatio: 100,
    });
    render(<ProgressBar />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%');
  });
});
