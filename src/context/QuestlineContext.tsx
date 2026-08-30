// src/context/QuestlineContext.tsx
// QuestlineProvider / useQuestline: orchestration for the questline-progress
// feature (Phase 5). This provider is a strict consumer of Phase 4: it reads
// the reactive `playerTotal` from useCapture() and never recomputes points.
//
// Responsibilities:
//  - Source Total_Points_To_Complete and Prize_Label from questlineConfig
//    (injectable via the `config` prop for tests) (Req 1.5, 2.3).
//  - Derive Progress_Ratio and Questline_Complete each render from the pure
//    logic in questline.ts (Req 1.3, 1.4, 2.1, 2.6, 2.7).
//  - Restore the redeemed flag and voucher code from localStorage on mount
//    (Req 2.5, 3.3).
//  - Generate + persist the voucher code exactly once on first completion, and
//    reuse the persisted code unchanged afterwards (Req 2.4, 2.5).
//  - Decide when the Redemption_Voucher_Screen should show:
//    showVoucher = isComplete && !redeemed (Req 2.1, 2.7, 3.2).
//  - Persist the redeemed flag when the visitor marks the voucher as redeemed
//    (Req 3.1, 3.2).
//
// The pure decisioning lives in questline.ts and the localStorage access lives
// in voucherStorage.ts; this module only wires them to React state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useCapture } from './CaptureContext';

import {
  computeProgressRatio,
  isComplete as isCompleteFn,
  resolvePrizeLabel,
  generateVoucherCode,
} from '../engine/questline';
import {
  readVoucherRedeemed,
  writeVoucherRedeemed,
  readVoucherCode,
  writeVoucherCode,
} from '../engine/voucherStorage';

import { questlineConfig as rawQuestlineConfig } from '../data/mandai.js';

/**
 * The configuration that drives completion and the prize label. Sourced from
 * `questlineConfig` in the dataset by default, but injectable for tests.
 */
export interface QuestlineConfig {
  totalPointsToComplete: number;
  prizeLabel: string;
}

const defaultConfig = rawQuestlineConfig as QuestlineConfig;

export interface QuestlineContextValue {
  /** Reactive accumulated points from useCapture() (Req 1.1, 1.2). */
  playerTotal: number;
  /** Sourced from config.totalPointsToComplete (Req 1.5). */
  totalPointsToComplete: number;
  /** Clamped [0,100] percentage for the Progress Bar (Req 1.3, 1.4). */
  progressRatio: number;
  /** playerTotal >= totalPointsToComplete (Req 2.1, 2.6, 2.7). */
  isComplete: boolean;
  /** True when complete AND not redeemed: the voucher should show (Req 2.1, 2.7, 3.2). */
  showVoucher: boolean;
  /** Resolved label (configured or placeholder) (Req 2.2, 2.3). */
  prizeLabel: string;
  /** The persisted voucher code, present once complete (Req 2.4, 2.5). */
  voucherCode: string | null;
  /** Whether the voucher has been marked redeemed (Req 3.1, 3.2, 3.3). */
  redeemed: boolean;
  /** Set the redeemed flag true, persist it, and hide the voucher (Req 3.1, 3.2). */
  markRedeemed: () => void;
}

const QuestlineContext = createContext<QuestlineContextValue | null>(null);

/**
 * Provides questline decisioning to the tree. `config` is injectable for
 * tests; it defaults to `questlineConfig` from the dataset.
 */
export function QuestlineProvider({
  config = defaultConfig,
  children,
}: {
  config?: QuestlineConfig;
  children: ReactNode;
}) {
  const { playerTotal } = useCapture();

  const totalPointsToComplete = config.totalPointsToComplete;

  // Restore persisted state on mount (Req 2.5, 3.3). Reads never throw and
  // normalize to safe defaults (false / null) (Req 3.4).
  const [redeemed, setRedeemed] = useState<boolean>(() => readVoucherRedeemed());
  const [voucherCode, setVoucherCode] = useState<string | null>(() =>
    readVoucherCode(),
  );

  // Derived each render from the pure logic (Req 1.3, 1.4, 2.1, 2.6, 2.7).
  const progressRatio = computeProgressRatio(playerTotal, totalPointsToComplete);
  const isComplete = isCompleteFn(playerTotal, totalPointsToComplete);

  // Generate + persist the voucher code exactly once on first completion
  // (Req 2.4). If a code already exists (in state or restored from storage) it
  // is reused unchanged (Req 2.5).
  useEffect(() => {
    if (isComplete && !redeemed && voucherCode === null) {
      const code = generateVoucherCode(Date.now());
      setVoucherCode(code);
      writeVoucherCode(code);
    }
  }, [isComplete, redeemed, voucherCode]);

  // showVoucher = complete AND not redeemed (Req 2.1, 2.7, 3.2).
  const showVoucher = isComplete && !redeemed;

  const prizeLabel = resolvePrizeLabel(config.prizeLabel);

  const markRedeemed = useCallback(() => {
    setRedeemed(true);
    writeVoucherRedeemed(true);
  }, []);

  const value = useMemo<QuestlineContextValue>(
    () => ({
      playerTotal,
      totalPointsToComplete,
      progressRatio,
      isComplete,
      showVoucher,
      prizeLabel,
      voucherCode,
      redeemed,
      markRedeemed,
    }),
    [
      playerTotal,
      totalPointsToComplete,
      progressRatio,
      isComplete,
      showVoucher,
      prizeLabel,
      voucherCode,
      redeemed,
      markRedeemed,
    ],
  );

  return (
    <QuestlineContext.Provider value={value}>
      {children}
    </QuestlineContext.Provider>
  );
}

/**
 * Consumer hook for the questline context. Throws if used outside a
 * {@link QuestlineProvider} so misuse is caught early.
 */
export function useQuestline(): QuestlineContextValue {
  const ctx = useContext(QuestlineContext);
  if (ctx === null) {
    throw new Error('useQuestline must be used within a QuestlineProvider');
  }
  return ctx;
}

export { QuestlineContext };
