/**
 * Copyright (c) 2026 Dave Woods <dave.woods@slice.com>. All rights reserved.
 *
 * ErrorBoundary.tsx — React error boundary (class component). Catches any unhandled
 * render error in the component tree and shows a recovery UI — the error message and
 * a reload button — instead of leaving the user with a blank page.
 */
import React from 'react';

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Dashboard error:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', maxWidth: '600px', margin: '4rem auto', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626' }}>Something went wrong</h2>
          <p style={{ color: '#4b5563' }}>
            An unexpected error occurred. Try refreshing the page. If the problem persists, use
            {' '}<strong>Settings → Wipe Settings</strong> to reset your configuration.
          </p>
          <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '6px', fontSize: '0.75rem', overflowX: 'auto', color: '#374151' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: '#494BCB', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
