# Requirements Document

## Introduction

This feature implements Phase 5 of the Mandai Wildlife Reserve visitor app: Questline Progress & Redemption. As a visitor collects animals across the reserve, this feature surfaces their overall progress toward a completion goal, celebrates completion with a redeemable prize, and remembers when the prize has been claimed so the celebration does not repeat on later visits.

A persistent progress element shows the visitor's accumulated points against a fixed completion goal. When the accumulated points reach the goal, the app unlocks a Redemption Voucher screen that presents the configured prize label together with a client-generated voucher code (no server validation, suitable for a live demo). A "Mark as redeemed" action records the redeemed state in `localStorage` so that the voucher screen does not reappear on subsequent visits in the same browser.

This feature depends on Phase 4 (checkpoint-photo-capture). Phase 4 is implemented and exposes, through the `useCapture()` context (`src/context/CaptureContext.tsx`), the `playerTotal` (a number derived reactively from the collected animals) and the `collection` (an array of `CollectedRecord`). Because `playerTotal` is exposed as React state, it updates without a page reload as new animals are collected. This feature reads the completion goal and prize label from `questlineConfig` in the exhibits dataset (`questlineConfig = { totalPointsToComplete: 100, prizeLabel: "Free scoop at Ah Meng Restaurant" }`).

## Glossary

- **System**: The questline progress and redemption module of the Mandai visitor web application.
- **Capture_Context**: The Phase 4 context exposed via `useCapture()` that provides the `Player_Total` and the collected records. Treated as an implemented dependency.
- **Player_Total**: The visitor's accumulated points across all collected exhibits, exposed by the Capture_Context as `playerTotal` and updated reactively as React state.
- **Questline_Config**: The configuration object `questlineConfig` in the exhibits dataset, containing the Total_Points_To_Complete and the Prize_Label.
- **Total_Points_To_Complete**: The point goal that marks the questline complete, sourced from `questlineConfig.totalPointsToComplete` (default value 100).
- **Prize_Label**: The human-readable description of the reward, sourced from `questlineConfig.prizeLabel` (default value "Free scoop at Ah Meng Restaurant").
- **Progress_Bar**: The persistent UI element (in a header or a dedicated tab) that displays the ratio of Player_Total to Total_Points_To_Complete.
- **Progress_Ratio**: The fraction Player_Total divided by Total_Points_To_Complete, expressed as a percentage from 0% to 100% for display in the Progress_Bar.
- **Questline_Complete**: The state in which Player_Total is greater than or equal to Total_Points_To_Complete.
- **Redemption_Voucher_Screen**: The UI shown on completion, displaying the Prize_Label and the Voucher_Code.
- **Voucher_Code**: A client-generated code derived from a timestamp, presented on the Redemption_Voucher_Screen, requiring no server validation. The Voucher_Code is persisted in `localStorage` (e.g., under the key `voucherCode`) so that it remains stable across renders and reloads.
- **Voucher_Redeemed_Flag**: The persisted boolean stored in `localStorage` under the key `voucherRedeemed`, indicating the voucher has been marked as redeemed.
- **Mark_As_Redeemed_Action**: The control on the Redemption_Voucher_Screen that sets the Voucher_Redeemed_Flag to true.

## Requirements

### Requirement 1: Progress Bar Display

**User Story:** As a visitor collecting animals, I want a persistent progress indicator, so that I always know how close I am to completing the questline.

#### Acceptance Criteria

1. THE System SHALL display the Progress_Bar as a persistent UI element showing the Player_Total relative to the Total_Points_To_Complete.
2. WHEN the Player_Total changes, THE System SHALL update the Progress_Bar to reflect the new total without a page reload.
3. THE System SHALL compute the Progress_Ratio as the Player_Total divided by the Total_Points_To_Complete, expressed as a percentage.
4. WHILE the Player_Total is greater than or equal to the Total_Points_To_Complete, THE System SHALL clamp the displayed Progress_Ratio to 100%.
5. THE System SHALL source the Total_Points_To_Complete from the Questline_Config.

### Requirement 2: Completion and Voucher Display

**User Story:** As a visitor who has collected enough animals, I want to be shown my prize voucher, so that I can claim my reward.

#### Acceptance Criteria

1. WHEN the Player_Total reaches or exceeds the Total_Points_To_Complete, THE System SHALL display the Redemption_Voucher_Screen within 1 second, provided the Voucher_Redeemed_Flag is not true.
2. IF the Player_Total reaches or exceeds the Total_Points_To_Complete AND the Prize_Label is absent or empty in the Questline_Config, THEN THE System SHALL still display the Redemption_Voucher_Screen with a placeholder Prize_Label indicating the prize is unavailable, and SHALL NOT block Voucher_Code display.
3. WHEN the Redemption_Voucher_Screen is displayed, THE System SHALL present the Prize_Label sourced from the Questline_Config.
4. WHEN the Redemption_Voucher_Screen is displayed for the first time after completion, THE System SHALL generate a Voucher_Code of between 6 and 32 alphanumeric characters derived from a timestamp on the client without contacting an external service, and SHALL persist the Voucher_Code.
5. WHEN the Redemption_Voucher_Screen is displayed and a persisted Voucher_Code already exists, THE System SHALL present the persisted Voucher_Code unchanged across every subsequent render and reload.
6. WHILE the Player_Total is greater than the Total_Points_To_Complete, THE System SHALL continue to treat the questline as Questline_Complete and SHALL present the Redemption_Voucher_Screen under the same conditions as when the Player_Total equals the Total_Points_To_Complete.
7. WHILE the Player_Total is below the Total_Points_To_Complete, THE System SHALL NOT display the Redemption_Voucher_Screen.

### Requirement 3: Redeemed State Persistence

**User Story:** As a visitor who has already claimed my prize, I want the app to remember that, so that the voucher screen does not reappear every time I open the app.

#### Acceptance Criteria

1. WHEN the visitor activates the Mark_As_Redeemed_Action, THE System SHALL set the Voucher_Redeemed_Flag to true in `localStorage` under the key `voucherRedeemed`.
2. WHILE the Voucher_Redeemed_Flag is true, THE System SHALL NOT display the Redemption_Voucher_Screen automatically, even when the questline is Questline_Complete.
3. WHEN the application loads, THE System SHALL read the Voucher_Redeemed_Flag from `localStorage` and SHALL restore the redeemed state so it survives a page refresh.
4. IF the Voucher_Redeemed_Flag in `localStorage` is absent or cannot be parsed, THEN THE System SHALL treat the redeemed state as not redeemed.
