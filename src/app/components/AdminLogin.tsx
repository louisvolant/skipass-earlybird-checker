// src/app/components/AdminLogin.tsx
// Login card displayed when the dashboard has no valid admin session.

'use client';
import React, { useState } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center">Admin Access</h2>
          <p className="text-center text-sm opacity-70">
            This dashboard is protected. Sign in to continue.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              className="input input-bordered w-full"
              placeholder="Admin password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
              required
            />
            {error && <p className="text-error text-sm text-center">{error}</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? <span className="loading loading-spinner" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
