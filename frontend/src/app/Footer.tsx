// src/app/Footer.tsx
'use client';

import Link from 'next/link';
import { externalLinks } from './links';
import { useTheme } from './ThemeProvider';

export default function Footer() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <footer className="bg-base-200 py-4 mt-8">
      <div className="container mx-auto px-4 text-center text-base-content">
        {/* External links */}
        <div className="mb-4">
          {externalLinks.map((link, index) => (
            <span key={link.href}>
              <Link href={link.href} className="mx-2 hover:text-primary">
                {link.label}
              </Link>
              {index < externalLinks.length - 1 && <span>|</span>}
            </span>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleDarkMode}
          className="btn btn-sm btn-outline mt-2 md:mt-0"
        >
          {darkMode ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Light Mode
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              Dark Mode
            </span>
          )}
        </button>

        {/* Copyright */}
        <div className="mt-4">
          © {new Date().getFullYear()} Skipass-Earlybird-Checker.louisvolant.com. All rights reserved.
        </div>
      </div>
    </footer>
  );
}