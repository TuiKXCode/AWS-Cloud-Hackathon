// src/components/__tests__/FilterChip.test.tsx
// Feature: food-web-dining — unit tests for the FilterChip component.
//
// Covers:
//  - Renders its label and reflects selected/unselected state via aria-pressed
//    (Req 5.1, 5.2).
//  - Calls onToggle with its tag when clicked (Req 5.1, 5.2).

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FilterChip } from '../FilterChip';

afterEach(() => {
  cleanup();
});

describe('FilterChip', () => {
  it('renders the provided label', () => {
    render(
      <FilterChip tag="halal" label="Halal" selected={false} onToggle={vi.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'Halal' })).toBeInTheDocument();
  });

  it('reflects the unselected state via aria-pressed=false', () => {
    render(
      <FilterChip
        tag="vegetarian"
        label="Vegetarian"
        selected={false}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Vegetarian' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('reflects the selected state via aria-pressed=true (Req 5.1)', () => {
    render(
      <FilterChip
        tag="vegetarian"
        label="Vegetarian"
        selected={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Vegetarian' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('calls onToggle with its tag when clicked (Req 5.1, 5.2)', () => {
    const onToggle = vi.fn();
    render(
      <FilterChip
        tag="air-conditioned"
        label="Air-Conditioned"
        selected={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Air-Conditioned' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith('air-conditioned');
  });
});
