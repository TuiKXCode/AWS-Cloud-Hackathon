// src/components/AudioPolishBoundary.tsx
// Phase 3 (Audio Polish) error boundary.
//
// Wraps Phase 3 audio/visual enhancements so that if any of them throw during
// render or lifecycle, the app silently falls back to the baseline Phase 1/2
// experience. No modal dialogs, toasts, or inline error messages are ever shown
// to the user — the only side effect on failure is a console.warn.
//
// Requirements: 5.1 (catch + log + continue), 5.2 (no user-visible errors),
//               5.4 (render baseline when Phase 3 fails to initialize).

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface AudioPolishBoundaryProps {
  /** The Phase 3 enhancements (and the baseline content they wrap). */
  children: ReactNode;
  /**
   * Optional baseline content to render instead of `children` when a Phase 3
   * enhancement throws. When omitted, `children` are re-rendered as-is.
   */
  fallback?: ReactNode;
}

interface AudioPolishBoundaryState {
  hasError: boolean;
}

class AudioPolishBoundary extends Component<
  AudioPolishBoundaryProps,
  AudioPolishBoundaryState
> {
  state: AudioPolishBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AudioPolishBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    // Silent, non-blocking degradation: log only, never surface to the user.
    console.warn(
      '[audio-polish] Module error, falling back to baseline:',
      error.message,
    );
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render the provided baseline fallback, or the children unchanged.
      // Either way, no error UI is presented to the user.
      return this.props.fallback ?? this.props.children;
    }
    return this.props.children;
  }
}

export { AudioPolishBoundary };
export type { AudioPolishBoundaryProps, AudioPolishBoundaryState };
