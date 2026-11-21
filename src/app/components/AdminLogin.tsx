// src/app/components/AdminLogin.tsx
// Login card displayed on the protected /admin configuration page when no valid session exists.

'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { login } from '@/lib/api';

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(password);
      onSuccess();
    } catch {
      setError('Invalid password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-sm bg-base-100 border border-base-300 shadow-lg">
        <div className="card-body p-5 space-y-3">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold">Admin Configuration</h1>
            <p className="text-xs opacity-70">
              Sign in to manage checker URLs, configurations, and manual runs.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              className="input input-bordered input-sm w-full"
              placeholder="Admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
            {error && <p className="text-error text-xs text-center">{error}</p>}
            <button type="submit" className="btn btn-primary btn-sm w-full" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Sign In'}
            </button>
          </form>
          <div className="text-center pt-1">
            <Link href="/" className="link link-hover text-xs opacity-75">
              ← Back to Public Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
