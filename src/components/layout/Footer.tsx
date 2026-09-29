/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { IS_DEMO_MODE } from '../../config/appConfig';

const LINKS = [
  { label: 'Portfolio', href: 'https://tobiloba-jagun-portfolio.vercel.app' },
  { label: 'GitHub', href: 'https://github.com/Tobilion' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tobiloba-jagun/' },
  { label: 'Instagram', href: 'https://www.instagram.com/theylovejagun' },
  { label: 'WhatsApp', href: 'https://wa.me/2347073948340' },
  { label: 'Email', href: 'mailto:tobilobajagun@gmail.com' },
];

/**
 * 6.4 Site footer. Demo mode carries the full maker credit with contact
 * links; public mode shows a slim credit line plus a Contact link.
 */
export const Footer: React.FC = () => {
  if (!IS_DEMO_MODE) {
    return (
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
          <span>
            <span className="font-bold text-[var(--color-text-main)]">Oja</span> · Campus trade, kept honest.
          </span>
          <a href="mailto:tobilobajagun@gmail.com" className="hover:text-[var(--color-text-main)] font-medium">
            Contact
          </a>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-[var(--color-text-main)]">
          Made by <span className="font-bold">Tobiloba Jagun</span>
          <span className="text-[var(--color-text-muted)]"> · 07073948340 · tobilobajagun@gmail.com</span>
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs" aria-label="Maker links">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-text-muted)] hover:text-[var(--color-brand-primary)] font-medium transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <p className="text-[11px] text-[var(--color-text-muted)]">Oja · Campus trade, kept honest. Demo build — all money is fake.</p>
      </div>
    </footer>
  );
};
