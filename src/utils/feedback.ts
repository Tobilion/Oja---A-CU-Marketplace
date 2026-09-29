/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FeedbackItem, FeedbackType } from '../types';
import { APP_MODE, APP_VERSION, FEEDBACK_EMAIL, FEEDBACK_WHATSAPP_NUMBER } from '../config/appConfig';

const MAX_BREADCRUMBS = 15;

const breadcrumbs: string[] = [];
let lastError: string | undefined;
let installed = false;

function stamp(): string {
  return new Date().toISOString().slice(11, 19);
}

/** Record a user action for the next feedback report (ring buffer, max 15). */
export function logUserAction(action: string): void {
  breadcrumbs.push(`${stamp()} ${action}`);
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
}

/**
 * Installs global capture once: last JS error, unhandled rejections, route
 * changes, and a boot entry. Called from App on startup.
 */
export function installGlobalFeedbackCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  logUserAction('app boot');
  window.addEventListener('error', (e) => {
    lastError = String(e.message || 'window.onerror').slice(0, 300);
  });
  window.addEventListener('unhandledrejection', (e) => {
    lastError = String((e.reason && (e.reason.message || e.reason)) || 'unhandled rejection').slice(0, 300);
  });
  window.addEventListener('hashchange', () => {
    logUserAction(`navigate ${window.location.hash || '(root)'}`);
  });
}

function browserLabel(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  return 'Other browser';
}

function viewportLabel(): string {
  if (typeof window === 'undefined') return 'unknown';
  return `${window.innerWidth}x${window.innerHeight}`;
}

function routeLabel(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.hash || window.location.pathname || '/';
}

export interface FeedbackDraft {
  type: FeedbackType;
  message: string;
  contact?: string;
}

/** Assembles the full report with auto-captured context (no secrets). */
export function buildFeedbackReport(
  draft: FeedbackDraft,
  args: { personaName?: string; context: string }
): Omit<FeedbackItem, 'id' | 'status' | 'createdAt'> {
  return {
    type: draft.type,
    message: draft.message.trim(),
    contact: draft.contact?.trim() || undefined,
    personaName: args.personaName,
    route: routeLabel(),
    context: args.context,
    appMode: APP_MODE,
    appVersion: APP_VERSION,
    browser: browserLabel(),
    viewport: viewportLabel(),
    timestamp: new Date().toISOString(),
    breadcrumbs: [...breadcrumbs],
    lastError,
  };
}

function shortReport(r: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): string {
  return (
    `Oja ${r.type} [${r.appMode} v${r.appVersion}] @ ${r.route} (${r.context})\n` +
    `${r.message}\n` +
    (r.contact ? `Contact: ${r.contact}\n` : '') +
    (r.personaName ? `Persona: ${r.personaName}\n` : '') +
    `${r.browser} ${r.viewport} ${r.timestamp}`
  );
}

function fullReport(r: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): string {
  return (
    `${shortReport(r)}\n` +
    `Breadcrumbs:\n${r.breadcrumbs.map((b) => `- ${b}`).join('\n') || '- (none)'}\n` +
    `Last JS error: ${r.lastError || '(none)'}`
  );
}

export function feedbackWhatsAppUrl(r: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): string {
  return `https://wa.me/${FEEDBACK_WHATSAPP_NUMBER}?text=${encodeURIComponent(shortReport(r))}`;
}

export function feedbackMailtoUrl(r: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): string {
  return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(`Oja ${r.type} report v${APP_VERSION}`)}&body=${encodeURIComponent(fullReport(r))}`;
}

export async function copyFeedbackReport(r: Omit<FeedbackItem, 'id' | 'status' | 'createdAt'>): Promise<void> {
  await navigator.clipboard.writeText(fullReport(r));
}
