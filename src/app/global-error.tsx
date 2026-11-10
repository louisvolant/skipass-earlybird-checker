'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error Captured]', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-900 text-slate-100 font-sans">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-6 shadow-2xl border border-rose-500/30 text-center">
          <div className="text-rose-400 text-4xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Application Error</h2>
          <p className="text-sm text-slate-300 mb-4">
            A critical root-level error occurred. Please try reloading or contact support.
          </p>
          {error?.message && (
            <div className="text-left text-xs bg-slate-950 p-3 rounded font-mono text-rose-300 mb-4 overflow-x-auto">
              <code>{error.message}</code>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => reset()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm transition-colors"
              type="button"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium text-sm transition-colors"
              type="button"
            >
              Hard Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
