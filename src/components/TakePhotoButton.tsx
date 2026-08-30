// src/components/TakePhotoButton.tsx
// TakePhotoButton: the capture trigger rendered inside the Nearby Exhibit Card
// footer. Part of the checkpoint-photo-capture feature (Phase 4).
//
// Responsibilities:
//  - Consume `nearestExhibit` from the LocationContext to decide whether the
//    visitor is in range; the button is enabled only when in range and a no-op
//    when out of range (Req 1.1, 1.2, 1.6).
//  - Own a hidden native file input configured for the device camera
//    (accept="image/*", capture="environment") so no custom camera preview UI
//    is built (Req 2.1, 2.2).
//  - Route the selected file to useCapture().handleCapturedFile, or signal a
//    cancelled capture (input opened, no file) via handleCaptureCancelled
//    (Req 2.3, 2.4).
//
// This component never reads geolocation directly; it consumes the shared
// LocationContext, and it never performs classification/persistence itself —
// that is the CaptureProvider's responsibility.

import { useRef, type ChangeEvent, type CSSProperties } from 'react';

import { useLocationContext } from '../context/LocationContext';
import { useCapture } from '../context/CaptureContext';

const buttonBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1.25rem',
  fontSize: '1rem',
  fontWeight: 600,
  lineHeight: 1.2,
  border: 'none',
  borderRadius: '0.5rem',
  color: '#ffffff',
};

const buttonEnabledStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: '#1f7a4d',
  cursor: 'pointer',
};

const buttonDisabledStyle: CSSProperties = {
  ...buttonBaseStyle,
  backgroundColor: '#9aa5a0',
  cursor: 'not-allowed',
  opacity: 0.7,
};

// Visually hidden but still present in the DOM so tests and the native camera
// flow can drive it. `hidden` keeps it out of the layout entirely.
const hiddenInputStyle: CSSProperties = {
  display: 'none',
};

/**
 * Renders the "Take Photo" action. Consumes the Location and Capture contexts
 * internally, so it takes no props. Must be rendered within both a
 * LocationProvider and a CaptureProvider.
 */
export function TakePhotoButton() {
  const { nearestExhibit } = useLocationContext();
  const { handleCapturedFile, handleCaptureCancelled } = useCapture();

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Enabled only when the visitor is in range of an exhibit (Req 1.1, 1.2).
  const inRange = nearestExhibit !== null;

  const handleButtonClick = () => {
    // Out of range: no-op so the disabled control cannot open the camera
    // (Req 1.6).
    if (!inRange) {
      return;
    }
    // Open the native camera via the hidden file input (Req 1.3, 2.1, 2.2).
    inputRef.current?.click();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    // Reset the input value so selecting the same file again still fires a
    // change event on a subsequent capture.
    event.target.value = '';

    if (file) {
      // A file was produced by the camera (Req 2.3).
      void handleCapturedFile(file);
    } else {
      // The native input was opened but returned no file (Req 2.4).
      handleCaptureCancelled();
    }
  };

  return (
    <div className="take-photo-button">
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={!inRange}
        aria-label="Take Photo"
        style={inRange ? buttonEnabledStyle : buttonDisabledStyle}
      >
        Take Photo
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        style={hiddenInputStyle}
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}

export default TakePhotoButton;
