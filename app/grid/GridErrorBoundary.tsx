"use client";

import { Component, type ReactNode } from "react";

interface State { hasError: boolean; }

export class GridErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-2xl flex flex-col items-center justify-center gap-3 glass"
          style={{ border: "1px solid var(--color-kraft)", height: "min(76vh, 660px)", minHeight: 380 }}
        >
          <svg className="w-10 h-10" style={{ color: "var(--color-pencil)" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm font-medium" style={{ color: "var(--color-ink)" }}>3D map unavailable</p>
          <p className="text-xs text-center max-w-xs" style={{ color: "var(--color-pencil)" }}>
            WebGL is not supported or has crashed on this device. Try reloading the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="rounded-lg px-4 py-2 text-xs font-medium"
            style={{ border: "1px solid var(--color-kraft)", color: "var(--color-pencil)" }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
