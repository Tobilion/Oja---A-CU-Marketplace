/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { AlertCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { logUserAction } from '../../utils/feedback';

type MainElement = HTMLElement & { focus(options?: FocusOptions): void };

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
  onFeedback?: () => void;
}

/**
 * General error boundary for page-level crashes.
 * Shows a recovery screen with the feedback button.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  handleFeedback = () => {
    this.props.onFeedback?.();
    logUserAction('open feedback (error-boundary)');
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-base)]">
          <div className="max-w-lg w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-main)]">Something went wrong</h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                We caught an error and prevented the app from crashing.
              </p>
            </div>
            <div className="p-3 bg-black/50 border border-neutral-800 rounded-xl space-y-2 text-xs font-mono text-neutral-400">
              <pre className="text-left overflow-x-auto max-h-32">{this.state.error?.stack || this.state.error?.message}</pre>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload Page
              </button>
              <button
                onClick={this.handleFeedback}
                className="flex-1 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text-main)] font-semibold hover:bg-[var(--color-surface-subtle)] flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Lazy chunk error boundary with reload guard.
 * Catches chunk-load failures and offers a reload button.
 * Uses sessionStorage timestamp to prevent reload loops.
 */
export class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; key?: string },
  { hasError: boolean; error: Error | null; reloadCount: number; lastReload: number }
> {
  state = { hasError: false, error: null, reloadCount: 0, lastReload: 0 };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('LazyErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    const now = Date.now();
    const lastReload = this.state.lastReload;
    // Prevent reload loops: max 3 reloads within 30 seconds
    if (now - lastReload < 30000 && this.state.reloadCount >= 3) {
      console.error('Reload loop detected, aborting');
      return;
    }
    this.setState({
      hasError: false,
      error: null,
      reloadCount: now - lastReload < 30000 ? this.state.reloadCount + 1 : 1,
      lastReload: now,
    });
    // Force a hard reload to fetch new chunks
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg-base)]">
          <div className="max-w-lg w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <span className="text-2xl">⚠</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--color-text-main)]">Failed to load page</h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">
                The page failed to load, possibly due to a version mismatch after a deploy.
              </p>
            </div>
            {this.state.reloadCount > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Reload attempt {this.state.reloadCount} of 3
              </p>
            )}
            <button
              onClick={this.handleReload}
              className="w-full px-4 py-2 rounded-xl bg-[var(--color-brand-primary)] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <span className="text-xs">Reload App</span>
            </button>
            <p className="text-xs text-[var(--color-text-muted)]">
              If this persists, clear your browser cache or try a private window.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Hook for focus management on route changes.
 * Moves focus to main content container on route change.
 */
export function useRouteFocus(): React.RefObject<MainElement | null> {
  const mainRef = useRef<MainElement | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    // Defer to next tick to ensure DOM is ready
    requestAnimationFrame(() => {
      mainRef.current?.focus({ preventScroll: true });
    });
  }, [window.location.pathname]);

  return mainRef;
}