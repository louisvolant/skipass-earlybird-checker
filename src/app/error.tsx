'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error Boundary Captured]', error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-base-100 text-base-content">
      <div className="card w-full max-w-md bg-base-200 shadow-xl border border-error/20">
        <div className="card-body text-center">
          <div className="flex justify-center mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 text-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="card-title justify-center text-xl font-bold">Something went wrong</h2>
          <p className="text-sm opacity-80 mt-1">
            An unexpected error occurred while loading this view. You can try recovering below.
          </p>
          {error?.message && (
            <div className="mockup-code text-left text-xs my-4 p-3 bg-base-300 overflow-x-auto">
              <code>{error.message}</code>
            </div>
          )}
          <div className="card-actions justify-center mt-4">
            <button
              onClick={() => reset()}
              className="btn btn-primary btn-sm"
              type="button"
            >
              Try Again
            </button>
            <Link href="/" className="btn btn-outline btn-sm">
              Reload Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
