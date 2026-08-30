// src/context/__tests__/QuestlineContext.test.tsx
// Feature: questline-progress (Phase 5) — integration tests (Task 4.2).
//
// These tests exercise the real QuestlineProvider + useQuestline() against the
// real questline.ts logic and the real voucherStorage.ts adapter (backed by
// jsdom's localStorage). The only seam is CaptureContext: it is mocked so each
// test can supply a controlled, mutable `playerTotal` and drive the provider's
// derived state deterministically.
//
// Coverage:
//   1. Injected config.totalPointsToComplete flows into totalPointsToComplete,
//      progressRatio, and isComplete.                         (Req 1.5)
//   2. Below threshold -> showVoucher false, voucherCode null.(Req 2.7)
//   3. At/over threshold, not redeemed -> showVoucher true, a code is generated
//      matching /^[A-Z0-9]{6,32}$/ and persisted to localStorage['voucherCode'].
//                                                             (Req 2.1, 2.4)
//   4. A seeded persisted voucherCode is reused unchanged, not regenerated.
//                                                             (Req 2.5)
//   5. markRedeemed() persists localStorage['voucherRedeemed'] === 'true' and
//      flips showVoucher to false.                            (Req 3.1, 3.2)
//   6. Seeded voucherRedeemed='true' + complete -> showVoucher false on mount.
//                                                             (Req 3.2, 3.3)
//   7. localStorage getItem/setItem throw -> provider still renders, redeemed
//      defaults false, and the code is held in memory.        (Req 3.3, 3.4)

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

// A mutable holder so each test can control the playerTotal that the mocked
// useCapture() reports. vi.hoisted lets the mock factory (also hoisted) close
// over it safely.
const captureState = vi.hoisted(() => ({ playerTotal: 0 }));

vi.mock('../CaptureContext', () => ({
  useCapture: () => ({ playerTotal: captureState.playerTotal }),
}));

import {
  QuestlineProvider,
  useQuestline,
  type QuestlineConfig,
} from '../QuestlineContext';
// The voucher fields live inside the single `mandaiEchoes.playerState` object the
// PRD fixes (§2, §3), so these tests go through the adapter rather than reading a
// key of their own.
import {
  readVoucherCode,
  readVoucherRedeemed,
  writeVoucherCode,
  writeVoucherRedeemed,
} from '../../engine/voucherStorage';

const CONFIG: QuestlineConfig = {
  totalPointsToComplete: 100,
  prizeLabel: 'Free scoop',
};

/**
 * Build an RTL wrapper that renders children inside a QuestlineProvider with
 * the supplied config (defaults to the shared CONFIG).
 */
function makeWrapper(config: QuestlineConfig = CONFIG) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QuestlineProvider config={config}>{children}</QuestlineProvider>;
  };
}

beforeEach(() => {
  captureState.playerTotal = 0;
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('QuestlineProvider / useQuestline integration', () => {
  it('flows injected config.totalPointsToComplete into progress + completion (Req 1.5)', () => {
    captureState.playerTotal = 50;

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.playerTotal).toBe(50);
    expect(result.current.totalPointsToComplete).toBe(100);
    expect(result.current.progressRatio).toBe(50);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.prizeLabel).toBe('Free scoop');
  });

  it('hides the voucher below threshold with no code generated (Req 2.7)', () => {
    captureState.playerTotal = 99; // below the 100 goal

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isComplete).toBe(false);
    expect(result.current.showVoucher).toBe(false);
    expect(result.current.voucherCode).toBeNull();
    expect(readVoucherCode()).toBeNull();
  });

  it('shows the voucher and generates + persists a code once complete (Req 2.1, 2.4)', async () => {
    // Freeze Date.now so the generated code is deterministic.
    const now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);

    captureState.playerTotal = 120; // >= 100 goal

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isComplete).toBe(true);

    // The code is produced by the mount effect; wait for the commit.
    await waitFor(() => {
      expect(result.current.voucherCode).not.toBeNull();
    });

    const code = result.current.voucherCode!;
    expect(code).toMatch(/^[A-Z0-9]{6,32}$/);
    expect(result.current.showVoucher).toBe(true);

    // Persisted under the voucher-code key, matching the in-memory code.
    expect(readVoucherCode()).toBe(code);
  });

  it('reuses a seeded persisted voucher code unchanged rather than regenerating (Req 2.5)', async () => {
    writeVoucherCode('SEEDED1');
    // A distinct Date.now so a regenerated code would obviously differ.
    vi.spyOn(Date, 'now').mockReturnValue(999_999);

    captureState.playerTotal = 200; // complete

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    // Restored from storage on mount.
    expect(result.current.voucherCode).toBe('SEEDED1');

    // Give the effect a chance to (incorrectly) run; the code must stay put.
    await Promise.resolve();
    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.voucherCode).toBe('SEEDED1');
    expect(readVoucherCode()).toBe('SEEDED1');
  });

  it('markRedeemed() persists the redeemed flag and hides the voucher (Req 3.1, 3.2)', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    captureState.playerTotal = 150; // complete

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    // Wait for the voucher to appear first.
    await waitFor(() => {
      expect(result.current.showVoucher).toBe(true);
    });
    expect(result.current.redeemed).toBe(false);

    act(() => {
      result.current.markRedeemed();
    });

    expect(result.current.redeemed).toBe(true);
    expect(result.current.showVoucher).toBe(false);
    expect(readVoucherRedeemed()).toBe(true);
  });

  it('suppresses the voucher on mount when redeemed was already persisted (Req 3.2, 3.3)', () => {
    writeVoucherRedeemed(true);
    writeVoucherCode('SEEDED1');
    captureState.playerTotal = 250; // complete

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isComplete).toBe(true);
    expect(result.current.redeemed).toBe(true);
    expect(result.current.showVoucher).toBe(false);
  });

  it('renders and defaults redeemed to false when localStorage throws (Req 3.3, 3.4)', async () => {
    // Force every localStorage access to throw (private-mode / disabled).
    const getSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });
    const setSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage unavailable');
      });

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    captureState.playerTotal = 130; // complete

    const { result } = renderHook(() => useQuestline(), {
      wrapper: makeWrapper(),
    });

    // Provider still renders and normalizes the failed reads to safe defaults.
    expect(result.current.redeemed).toBe(false);
    expect(result.current.isComplete).toBe(true);

    // The generate effect can still run and hold the code in memory even though
    // the persisting write threw.
    await waitFor(() => {
      expect(result.current.voucherCode).not.toBeNull();
    });
    expect(result.current.voucherCode).toMatch(/^[A-Z0-9]{6,32}$/);
    expect(result.current.showVoucher).toBe(true);

    getSpy.mockRestore();
    setSpy.mockRestore();
  });
});
