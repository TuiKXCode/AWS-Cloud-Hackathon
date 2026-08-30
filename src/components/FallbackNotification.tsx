interface FallbackNotificationProps {
  /** Whether the notification is currently shown. */
  visible: boolean;
  /** Called when the user dismisses the notification. */
  onDismiss: () => void;
}

/**
 * Dismissible banner shown when browser geolocation could not be used
 * (permission denied, timeout, or unavailable) and the app has fallen back
 * to the first demo location.
 *
 * Renders nothing when `visible` is false.
 *
 * Requirements: 5.4
 */
export function FallbackNotification({
  visible,
  onDismiss,
}: FallbackNotificationProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#fff3cd',
        color: '#664d03',
        border: '1px solid #ffe69c',
        borderRadius: '6px',
      }}
    >
      <span style={{ flex: 1 }}>
        Location permission was not granted, so a default location is being
        used. You can pick a location from the simulator to explore other areas.
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          fontSize: '1.25rem',
          lineHeight: 1,
          cursor: 'pointer',
          padding: '0 0.25rem',
        }}
      >
        &times;
      </button>
    </div>
  );
}

export default FallbackNotification;
