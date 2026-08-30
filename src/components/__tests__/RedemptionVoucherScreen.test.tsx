// src/components/__tests__/RedemptionVoucherScreen.test.tsx
// Feature: questline-progress — component tests for RedemptionVoucherScreen.
//
// Covers:
//  - Renders the provided prizeLabel (Req 2.3).
//  - Renders the voucher code region even when the prizeLabel is a placeholder
//    like "Prize unavailable" (Req 2.2).
//  - Clicking "Mark as redeemed" calls onMarkRedeemed (Req 3.1).

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RedemptionVoucherScreen } from '../RedemptionVoucherScreen';

afterEach(() => {
  cleanup();
});

describe('RedemptionVoucherScreen', () => {
  it('renders the provided prizeLabel (Req 2.3)', () => {
    render(
      <RedemptionVoucherScreen
        prizeLabel="Free scoop at Ah Meng Restaurant"
        voucherCode="ABC123"
        onMarkRedeemed={() => {}}
      />,
    );

    expect(screen.getByText('Free scoop at Ah Meng Restaurant')).toBeInTheDocument();
  });

  it('renders as a labeled modal dialog with the voucher code (Req 2.2)', () => {
    render(
      <RedemptionVoucherScreen
        prizeLabel="Free scoop at Ah Meng Restaurant"
        voucherCode="VCODE9"
        onMarkRedeemed={() => {}}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Redemption voucher');
    expect(screen.getByTestId('voucher-code')).toHaveTextContent('VCODE9');
  });

  it('renders the voucher code region even when the prizeLabel is a placeholder (Req 2.2)', () => {
    render(
      <RedemptionVoucherScreen
        prizeLabel="Prize unavailable"
        voucherCode="ZZ9988"
        onMarkRedeemed={() => {}}
      />,
    );

    // The placeholder label is shown...
    expect(screen.getByText('Prize unavailable')).toBeInTheDocument();
    // ...and the code region is still rendered and displays the code.
    expect(screen.getByTestId('voucher-code')).toHaveTextContent('ZZ9988');
  });

  it('calls onMarkRedeemed when "Mark as redeemed" is clicked (Req 3.1)', () => {
    const onMarkRedeemed = vi.fn();
    render(
      <RedemptionVoucherScreen
        prizeLabel="Free scoop at Ah Meng Restaurant"
        voucherCode="ABC123"
        onMarkRedeemed={onMarkRedeemed}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mark as redeemed' }));

    expect(onMarkRedeemed).toHaveBeenCalledTimes(1);
  });
});
