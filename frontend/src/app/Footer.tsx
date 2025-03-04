// src/app/Footer.tsx
'use client';

import Link from 'next/link';
import { externalLinks } from './links';

export default function Footer() {
  return (
    <footer className="bg-gray-200 dark:bg-gray-800 py-4 mt-8">
      <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-300">
        {/* External links */}
        <div className="mb-4">
          {externalLinks.map((link, index) => (
            <span key={link.href}>
              <Link href={link.href} className="mx-2 hover:text-gray-800 dark:hover:text-gray-100">
                {link.label}
              </Link>
              {index < externalLinks.length - 1 && <span>|</span>}
            </span>
          ))}
        </div>

        {/* Copyright */}
        <div className="mt-4">
          © {new Date().getFullYear()} Skipass-Earlybird-Checker.louisvolant.com. All rights reserved.
        </div>
      </div>
    </footer>
  );
}