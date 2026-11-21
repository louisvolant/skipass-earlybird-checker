// src/app/Footer.tsx
'use client';

import React from 'react';
import { externalLinks } from './links';
import { useTheme } from './ThemeProvider';

export default function Footer() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <footer className="mt-auto border-t border-base-300 bg-base-100/80 py-3 text-xs text-base-content/70">
      <div className="container mx-auto px-3 md:px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="text-center sm:text-left">
          © {new Date().getFullYear()} LouisVolant.com. All rights reserved.
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <nav className="flex items-center gap-2.5" aria-label="Personal">
            {externalLinks.map((link, index) => (
              <React.Fragment key={link.href}>
                {index > 0 && <span aria-hidden="true" className="opacity-40">|</span>}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  {link.label}
                </a>
              </React.Fragment>
            ))}
          </nav>

          <button
            type="button"
            onClick={toggleDarkMode}
            className="btn btn-xs btn-outline"
            aria-label="Toggle color theme"
          >
            {darkMode ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Light
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
                Dark
              </span>
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}
