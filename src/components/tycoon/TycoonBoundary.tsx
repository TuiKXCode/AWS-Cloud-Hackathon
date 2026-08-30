// src/components/tycoon/TycoonBoundary.tsx
// Error boundary around the Phase 7 game.
//
// Without one, anything the game throws during render unmounts the WHOLE React
// tree: the header, the tabs and every other phase go with it, and the page is
// simply blank. That is a bad failure for a demo — it looks like the app is
// broken rather than one tab, and it leaves no way to navigate away.
//
// This keeps the failure local. The shell stays up, the other tabs keep
// working, and the visitor is told what happened with a way to retry.
//
// It deliberately does NOT follow AudioPolishBoundary's silent-degradation
// pattern. That boundary hides cosmetic enhancements whose absence nobody
// notices; here the tab's entire content is gone, so saying nothing would leave
// an unexplained empty panel.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface TycoonBoundaryProps {
  children: ReactNode;
}

interface TycoonBoundaryState {
  error: Error | null;
}

class TycoonBoundary extends Component<TycoonBoundaryProps, TycoonBoundaryState> {
  state: TycoonBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): TycoonBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[tycoon] The kitchen crashed:', error, errorInfo.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }

    // A stale dev server is by far the most common cause of this in practice —
    // one left running across a change to the Vite config or the entry point
    // serves a mismatched module graph, and the symptom is a ReferenceError on
    // mount. Worth naming, because the fix is not obvious from the message.
    const looksLikeStaleDevServer = /is not defined|Failed to fetch dynamically imported/i.test(
      error.message,
    );

    return (
      <div
        role="alert"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '1.5rem',
          textAlign: 'center',
          color: '#ECFDF5',
        }}
      >
        <p style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
          The kitchen could not start.
        </p>
        <p style={{ fontSize: '0.85rem', opacity: 0.85, margin: 0, maxWidth: '34rem' }}>
          {looksLikeStaleDevServer
            ? 'This usually means the dev server has been running since before the code changed. Stop it and run npm run dev again; if it persists, delete node_modules/.vite first.'
            : 'Something went wrong loading the game. The rest of the app is still fine — switch tabs, or try again.'}
        </p>
        <code
          style={{
            fontSize: '0.7rem',
            opacity: 0.65,
            maxWidth: '34rem',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </code>
        <button
          type="button"
          onClick={this.handleRetry}
          style={{
            marginTop: '0.25rem',
            padding: '0.5rem 1.1rem',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '9999px',
            backgroundColor: '#FBBF24',
            color: '#3B2606',
            fontWeight: 800,
            fontSize: '0.8rem',
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

export { TycoonBoundary };
export type { TycoonBoundaryProps, TycoonBoundaryState };
