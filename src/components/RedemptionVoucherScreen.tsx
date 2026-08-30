// src/components/RedemptionVoucherScreen.tsx
// RedemptionVoucherScreen: the completion overlay for the questline-progress
// feature (Phase 5). Shown when the questline is complete and the voucher has
// not been redeemed. Presents the (already resolved) prize label, the
// client-generated voucher code, and a "Mark as redeemed" action.
//
// The `prizeLabel` prop is resolved by the QuestlineProvider — it may be a
// placeholder (e.g. "Prize unavailable"). Regardless of the label, the voucher
// code region is ALWAYS rendered so completion never dead-ends (Req 2.2).
//
// Uses inline styles per project convention (Tailwind is not installed),
// following the fixed-overlay pattern established by ResultScreen.tsx.

import { useState, type CSSProperties } from 'react';
import { colors, radius, shadow, space, font, gradients } from '../theme';

export interface RedemptionVoucherScreenProps {
  /** Already resolved by the provider (may be the placeholder label) (Req 2.3). */
  prizeLabel: string;
  /** The persisted client-generated voucher code (Req 2.4, 2.5). */
  voucherCode: string;
  /** Invoked when the visitor taps "Mark as redeemed" (Req 3.1). */
  onMarkRedeemed: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  padding: '16px',
  zIndex: 1000,
};

const cardStyle: CSSProperties = {
  backgroundColor: colors.cream,
  borderRadius: radius.lg,
  boxShadow: shadow.raised,
  maxWidth: '420px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: 0,
  boxSizing: 'border-box',
  textAlign: 'center',
  fontFamily: font.family,
  overflow: 'hidden',
};

const bannerStyle: CSSProperties = {
  padding: `${space.xl}px ${space.xl}px ${space.lg}px`,
  background: gradients.forest,
};

const bodyStyle: CSSProperties = {
  padding: `${space.lg}px ${space.xl}px ${space.xl}px`,
};

const headingStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: '1.5rem',
  fontWeight: 800,
  color: colors.white,
};

const subheadingStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.9rem',
  color: colors.limeTint,
};

const prizeLabelStyle: CSSProperties = {
  margin: '0 0 4px',
  fontSize: '1.15rem',
  fontWeight: 700,
  color: colors.forestGreen,
};

const sectionLabelStyle: CSSProperties = {
  margin: `${space.lg}px 0 ${space.sm}px`,
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: colors.textMuted,
};

const voucherCodeStyle: CSSProperties = {
  margin: `0 auto ${space.sm}px`,
  display: 'inline-block',
  padding: `${space.md}px ${space.lg}px`,
  borderWidth: '2px',
  borderStyle: 'dashed',
  borderColor: colors.green,
  borderRadius: radius.md,
  backgroundColor: colors.leafTint,
  fontFamily: 'monospace',
  fontSize: '1.25rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: colors.forestGreen,
};

const redeemButtonStyle: CSSProperties = {
  marginTop: space.xl,
  width: '100%',
  padding: `${space.md}px ${space.lg}px`,
  border: 'none',
  borderRadius: radius.md,
  backgroundColor: colors.forestGreen,
  color: colors.white,
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'background-color 160ms ease',
};

/**
 * Renders the redemption voucher overlay on questline completion. The prize
 * label and voucher code are provided by the caller; the code region is always
 * shown even when the label is the placeholder (Req 2.2).
 */
export function RedemptionVoucherScreen({
  prizeLabel,
  voucherCode,
  onMarkRedeemed,
}: RedemptionVoucherScreenProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Redemption voucher"
    >
      <div style={cardStyle}>
        <div style={bannerStyle}>
          <h2 style={headingStyle}>Questline Complete!</h2>
          <p style={subheadingStyle}>You've collected enough animals to claim your reward.</p>
        </div>

        <div style={bodyStyle}>
          {/* Req 2.3: present the resolved Prize_Label. */}
          <p style={sectionLabelStyle}>Your prize</p>
          <p style={prizeLabelStyle}>{prizeLabel}</p>

          {/* Req 2.2: the voucher code region is always rendered, even when the
              prize label is the placeholder. */}
          <p style={sectionLabelStyle}>Voucher code</p>
          <span style={voucherCodeStyle} data-testid="voucher-code">
            {voucherCode}
          </span>

          {/* Req 3.1: mark-as-redeemed control. */}
          <button
            type="button"
            style={hovered ? { ...redeemButtonStyle, backgroundColor: colors.green } : redeemButtonStyle}
            onClick={onMarkRedeemed}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            Mark as redeemed
          </button>
        </div>
      </div>
    </div>
  );
}

export default RedemptionVoucherScreen;
