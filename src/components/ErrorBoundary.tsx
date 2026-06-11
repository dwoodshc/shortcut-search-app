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
        <div className="p-8 max-w-xl mx-auto mt-16">
          <h2 className="text-red-600">Something went wrong</h2>
          <p className="text-gray-600">
            An unexpected error occurred. Try refreshing the page. If the problem persists, use
            {' '}<strong>Settings → Wipe Settings</strong> to reset your configuration.
          </p>
          <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-x-auto text-gray-700">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-5 py-2 bg-[#494BCB] text-white border-0 rounded-md cursor-pointer text-sm"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
