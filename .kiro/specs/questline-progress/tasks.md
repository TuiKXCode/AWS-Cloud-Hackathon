# Implementation Plan: Questline Progress & Redemption

## Overview

This plan implements Phase 5 (Questline Progress & Redemption) as a strict consumer of the implemented Phase 4 (`useCapture()`) and the `questlineConfig` dataset. Work proceeds bottom-up: first the pure, property-testable logic (`questline.ts`), then the `localStorage` adapter (`voucherStorage.ts`), then the orchestration provider/hook, then the two UI pieces, and finally the App shell wiring and end-to-end integration tests. Each step builds on the previous and ends with integration so no code is left orphaned.

Stack: Vite + React 18 (TypeScript), Vitest + fast-check, React Testing Library. Tailwind is NOT installed — UI uses inline styles / plain CSS.

## Tasks

- [ ] 1. Implement the pure questline logic core
  - [ ] 1.1 Create `src/engine/questline.ts` with the pure functions and constants
    - Define `PLACEHOLDER_PRIZE_LABEL`, `VOUCHER_CODE_MIN_LENGTH` (6), `VOUCHER_CODE_MAX_LENGTH` (32)
    - Implement `computeProgressRatio(playerTotal, total)`: `(playerTotal / total) * 100` clamped to `[0, 100]`; non-positive/non-finite `total` returns 100 when `playerTotal > 0` else 0; negative `playerTotal` clamps to 0
    - Implement `isComplete(playerTotal, total)`: returns `playerTotal >= total`; non-positive/non-finite `total` treated as met for finite `playerTotal >= 0`
    - Implement `resolvePrizeLabel(prizeLabel)`: return the input when it contains at least one non-whitespace character, otherwise `PLACEHOLDER_PRIZE_LABEL`
    - Implement `generateVoucherCode(timestamp)`: base-36 encode the timestamp, upper-case, pad to the minimum length; output `[A-Z0-9]+`, length 6..32, deterministic from input
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.6, 2.7_

  - [ ]* 1.2 Write property test for progress ratio (`src/engine/__tests__/questline.property.test.ts`)
    - **Property 1: Progress ratio is the clamped percentage in [0, 100]**
    - Random finite `playerTotal >= 0`, `total > 0`; assert result in `[0,100]`, equals `(playerTotal/total)*100` within tolerance when `0 <= playerTotal <= total`, and exactly `100` when `playerTotal >= total`; fast-check, min 100 iterations
    - **Validates: Requirements 1.3, 1.4**

  - [ ]* 1.3 Write property test for completion threshold (`questline.property.test.ts`)
    - **Property 2: Completion holds exactly when the total meets or exceeds the goal**
    - Random finite `playerTotal`, `total`; assert `isComplete(playerTotal, total) === (playerTotal >= total)`; fast-check, min 100 iterations
    - **Validates: Requirements 2.1, 2.6, 2.7**

  - [ ]* 1.4 Write property test for prize label resolution (`questline.property.test.ts`)
    - **Property 3: Prize label resolves to the configured label or the placeholder**
    - Mix of empty/whitespace strings, `null`/`undefined`, and non-whitespace strings; assert placeholder for empty/whitespace/nullish, passthrough otherwise; fast-check, min 100 iterations
    - **Validates: Requirements 2.2**

  - [ ]* 1.5 Write property test for voucher code generation (`questline.property.test.ts`)
    - **Property 4: Voucher codes are alphanumeric, length-bounded, and deterministic from the timestamp**
    - Random integers incl. `0`, negatives, large values; assert length `[6,32]`, matches `/^[A-Z0-9]+$/`, and `generateVoucherCode(t) === generateVoucherCode(t)`; fast-check, min 100 iterations
    - **Validates: Requirements 2.4**

- [ ] 2. Implement the persistence adapter
  - [ ] 2.1 Create `src/engine/voucherStorage.ts` mirroring `storage.ts`
    - Define `VOUCHER_REDEEMED_KEY = 'voucherRedeemed'`, `VOUCHER_CODE_KEY = 'voucherCode'`
    - Implement `readVoucherRedeemed()`: returns `true` only when stored value parses to boolean `true`; absent/unparseable/any-error → `false`; never throws
    - Implement `writeVoucherRedeemed(redeemed)`: persist JSON boolean string; returns `false` on any error; never throws
    - Implement `readVoucherCode()`: return persisted code, or `null` when absent/empty/any-error; never throws
    - Implement `writeVoucherCode(code)`: persist raw string; returns `false` on any error; never throws
    - _Requirements: 2.4, 2.5, 3.1, 3.3, 3.4_

  - [ ]* 2.2 Write unit tests for `voucherStorage.ts` (`src/engine/__tests__/voucherStorage.test.ts`)
    - Assert `readVoucherRedeemed` returns `false` for malformed raw values (`"1"`, `"yes"`, `""`, non-JSON) and `true` only for `"true"`
    - Assert round-trip of redeemed flag and code; assert reads normalize to safe defaults (`false` / `null`) and writes return `false` when `localStorage` throws (private mode / quota) without throwing
    - _Requirements: 2.4, 2.5, 3.1, 3.3, 3.4_

- [ ] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement the QuestlineProvider orchestration
  - [ ] 4.1 Create `src/context/QuestlineContext.tsx` with `QuestlineProvider` and `useQuestline()`
    - Define `QuestlineContextValue` (playerTotal, totalPointsToComplete, progressRatio, isComplete, showVoucher, prizeLabel, voucherCode, redeemed, markRedeemed)
    - Accept optional injectable `config` prop (defaults to `questlineConfig` from `src/data/mandai.js`)
    - On mount, restore `redeemed` via `readVoucherRedeemed()` and `voucherCode` via `readVoucherCode()`
    - Consume `playerTotal` from `useCapture()`; derive `progressRatio = computeProgressRatio(...)` and `isComplete = isComplete(...)` each render
    - In an effect, when `isComplete && !redeemed && voucherCode === null`, generate code via `generateVoucherCode(Date.now())`, set state, and `writeVoucherCode(code)`; reuse existing code unchanged otherwise
    - Compute `showVoucher = isComplete && !redeemed`; resolve `prizeLabel` via `resolvePrizeLabel(config.prizeLabel)`
    - Implement `markRedeemed()`: set `redeemed = true`, call `writeVoucherRedeemed(true)`, hide the voucher
    - `useQuestline()` throws a clear error when used outside the provider
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3_

  - [ ]* 4.2 Write integration tests for `QuestlineProvider`/`useQuestline` (`src/context/__tests__/QuestlineContext.test.tsx`)
    - Injected `config.totalPointsToComplete` flows into progress + completion (Req 1.5)
    - Below threshold → `showVoucher` false (Req 2.7); reaches/exceeds threshold and not redeemed → `showVoucher` true, code generated + persisted (Req 2.1, 2.4)
    - Seeded persisted `voucherCode` reused unchanged across re-renders/remounts (Req 2.5)
    - `markRedeemed()` sets `localStorage['voucherRedeemed']` true and flips `showVoucher` false (Req 3.1, 3.2)
    - Seed `voucherRedeemed=true` + complete → voucher suppressed on mount (Req 3.2, 3.3); `localStorage` throws → provider still renders, redeemed defaults false, code held in memory (Req 3.3, 3.4)
    - Mock `useCapture()` / supply controlled `playerTotal`; stub `Date.now()` where asserting the code
    - _Requirements: 1.5, 2.1, 2.4, 2.5, 2.7, 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Implement the UI components
  - [ ] 5.1 Create `src/components/ProgressBar.tsx`
    - Consume `useQuestline()`; render a labeled bar whose fill width is `${progressRatio}%` plus text `playerTotal / totalPointsToComplete`
    - Use inline styles (Tailwind not installed)
    - Accessibility: `role="progressbar"`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow={Math.round(progressRatio)}`
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 5.2 Write component tests for `ProgressBar` (`src/components/__tests__/ProgressBar.test.tsx`)
    - Renders with `role="progressbar"` and correct `aria-valuenow`; updating the mocked `playerTotal` updates fill/text without a remount (Req 1.2)
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 5.3 Create `src/components/RedemptionVoucherScreen.tsx`
    - Props: `prizeLabel` (already resolved), `voucherCode`, `onMarkRedeemed`
    - Render as a fixed overlay: `role="dialog"`, `aria-modal`, labeled heading; present the `prizeLabel`, the `voucherCode` region (always rendered even when label is the placeholder), and a "Mark as redeemed" button wired to `onMarkRedeemed`
    - Use inline styles
    - _Requirements: 2.2, 2.3, 3.1_

  - [ ]* 5.4 Write component tests for `RedemptionVoucherScreen` (`src/components/__tests__/RedemptionVoucherScreen.test.tsx`)
    - Renders provided `prizeLabel` (Req 2.3); renders the code region even when `prizeLabel` is the placeholder (Req 2.2); clicking "Mark as redeemed" calls `onMarkRedeemed`
    - _Requirements: 2.2, 2.3, 3.1_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Integrate into the App shell
  - [ ] 7.1 Wire `QuestlineProvider` and UI into `src/App.tsx`
    - Wrap the shell in `QuestlineProvider` inside `CaptureProvider` (order: `LocationProvider` > `CaptureProvider` > `QuestlineProvider` > `AppShell`)
    - Render `<ProgressBar />` persistently above the tab navigation so it stays visible across tab switches
    - Read `{ showVoucher, prizeLabel, voucherCode, markRedeemed }` from `useQuestline()` and conditionally render `<RedemptionVoucherScreen />` as an overlay when `showVoucher && voucherCode !== null`
    - _Requirements: 1.1, 2.1, 2.7, 3.2_

  - [ ]* 7.2 Write integration tests for the App shell wiring (`src/components/__tests__/QuestlineShellIntegration.test.tsx`)
    - `ProgressBar` present and persistent across tab switches (Req 1.1)
    - Below threshold → no voucher overlay; reaching threshold → overlay appears on the next commit with no polling (Req 2.1, 2.7); after `markRedeemed()` the overlay is suppressed even while complete (Req 3.2)
    - _Requirements: 1.1, 2.1, 2.7, 3.2_

- [ ] 8. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation.
- Property tests validate the four universal correctness properties on the pure `questline.ts` core; each is a single fast-check test with a minimum of 100 iterations.
- Unit, component, and integration tests cover persistence, reactivity, restore-on-mount, redeemed gating, and the 1-second auto-show budget, which do not vary meaningfully with input.
- This feature adds no new dependencies and uses inline styles (Tailwind is not installed).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "2.2", "4.1"] },
    { "id": 2, "tasks": ["4.2", "5.1", "5.3"] },
    { "id": 3, "tasks": ["5.2", "5.4", "7.1"] },
    { "id": 4, "tasks": ["7.2"] }
  ]
}
```
