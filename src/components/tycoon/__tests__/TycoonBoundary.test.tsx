// src/components/tycoon/__tests__/TycoonBoundary.test.tsx
// The point of the boundary is that a crash in the game stays in the game. Before it
// existed, anything TycoonGame threw unmounted the whole tree and the page went blank —
// no header, no tabs, no way out.

import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TycoonBoundary } from '../TycoonBoundary';

/** Always throws, so the boundary has something to catch. */
function Bomb({ message }: { message: string }) {
  throw new Error(message);
  // eslint-disable-next-line no-unreachable
  return null;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // React logs every caught error; keep the test output readable.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe('TycoonBoundary', () => {
  it('renders the game when nothing goes wrong', () => {
    render(
      <TycoonBoundary>
        <p>the kitchen</p>
      </TycoonBoundary>,
    );
    expect(screen.getByText('the kitchen')).toBeInTheDocument();
  });

  it('shows an explanation instead of a blank panel when the game throws', () => {
    render(
      <TycoonBoundary>
        <Bomb message="kaboom" />
      </TycoonBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/could not start/i)).toBeInTheDocument();
    // The real message is surfaced rather than swallowed.
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('names the stale dev server for the error that actually shows up', () => {
    render(
      <TycoonBoundary>
        <Bomb message="React is not defined" />
      </TycoonBoundary>,
    );

    expect(screen.getByText(/dev server/i)).toBeInTheDocument();
    expect(screen.getByText(/node_modules\/\.vite/i)).toBeInTheDocument();
  });

  it('falls back to generic advice for an unrelated failure', () => {
    render(
      <TycoonBoundary>
        <Bomb message="something else entirely" />
      </TycoonBoundary>,
    );

    expect(screen.queryByText(/dev server/i)).toBeNull();
    expect(screen.getByText(/rest of the app is still fine/i)).toBeInTheDocument();
  });

  it('offers a retry that re-mounts the game', () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('transient');
      return <p>the kitchen</p>;
    }

    render(
      <TycoonBoundary>
        <Flaky />
      </TycoonBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('the kitchen')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
