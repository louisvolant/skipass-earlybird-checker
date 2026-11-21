// src/app/admin/page.tsx
// Protected administration screen for managing monitored site URLs, checker configurations,
// manual crawler runs, and check history cleanup.

'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  getLastChecks,
  forceCheck,
  deleteCheckContent,
  getDBSize,
  clearCache,
  getSession,
  logout,
  AUTH_EXPIRED_EVENT,
} from '@/lib/api';
import { formatCompactTimestamp } from '@/lib/dashboard-utils';
import { Check } from '@/lib/types';
import AdminLogin from '../components/AdminLogin';
import CheckerConfiguration from '../components/CheckerConfiguration';
import DBUsage from '../components/DBUsage';

type AuthStatus = 'checking' | 'signedIn' | 'signedOut';

export default function AdminPage() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [checks, setChecks] = useState<Check[]>([]);
  const [isChecksLoading, setIsChecksLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsChecksLoading(true);
      const [checksData, dbUsage] = await Promise.all([getLastChecks(), getDBSize()]);
      setChecks(checksData);
      setDbSize(dbUsage.size);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsChecksLoading(false);
    }
  }, []);

  useEffect(() => {
    getSession()
      .then(() => setAuthStatus('signedIn'))
      .catch(() => setAuthStatus('signedOut'));

    const onAuthExpired = () => setAuthStatus('signedOut');
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  useEffect(() => {
    if (authStatus === 'signedIn') {
      fetchAdminData();
    }
  }, [authStatus, fetchAdminData]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    if (type === 'success') {
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const handleForceCheck = async () => {
    setActionLoading(true);
    setNotice(null);
    try {
      await forceCheck();
      await fetchAdminData();
      showNotice('success', 'Manual check completed.');
    } catch (error) {
      console.error('Failed to force check:', error);
      showNotice('error', 'Failed to run manual check.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearCache = async () => {
    setActionLoading(true);
    setNotice(null);
    try {
      await clearCache();
      await fetchAdminData();
      showNotice('success', 'Server cache cleared.');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      showNotice('error', 'Failed to clear cache.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCheck = async (checkId: number) => {
    if (!confirm(`Delete check #${checkId}?`)) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await deleteCheckContent(checkId);
      setChecks((prev) => prev.filter((check) => check.id !== checkId));
      showNotice('success', `Check #${checkId} deleted.`);
    } catch (error) {
      console.error('Failed to delete check:', error);
      showNotice('error', 'Failed to delete check.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setAuthStatus('signedOut');
    }
  };

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (authStatus === 'signedOut') {
    return <AdminLogin onSuccess={() => setAuthStatus('signedIn')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-base-200/40">
      {/* Compact Sticky Admin Header */}
      <header className="sticky top-0 z-20 bg-base-100/95 backdrop-blur border-b border-base-300">
        <div className="container mx-auto px-3 md:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <Image src="/icon.png" alt="SkiPass Checker Logo" width={30} height={30} className="rounded" />
              <span className="text-base md:text-lg font-bold truncate">Admin & Configuration</span>
            </Link>
            <span className="badge badge-primary badge-xs">Protected</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="btn btn-xs sm:btn-sm btn-ghost">
              ← Public View
            </Link>
            <button
              className="btn btn-xs sm:btn-sm btn-warning"
              onClick={handleForceCheck}
              disabled={actionLoading}
            >
              {actionLoading ? <span className="loading loading-spinner loading-xs" /> : 'Force Check'}
            </button>
            <button
              className="btn btn-xs sm:btn-sm btn-outline"
              onClick={handleClearCache}
              disabled={actionLoading}
            >
              Clear Cache
            </button>
            <button className="btn btn-xs sm:btn-sm btn-ghost text-error" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-3 md:px-4 py-4 space-y-4">
        {notice && (
          <div className={`alert ${notice.type === 'success' ? 'alert-success' : 'alert-error'} py-2 px-3 text-xs`}>
            <span>{notice.text}</span>
          </div>
        )}

        {/* Full Admin Configuration Manager (Create / Edit / Delete Site URLs & Alerts) */}
        <CheckerConfiguration readOnly={false} />

        {/* Compact Check History Moderation */}
        <section className="bg-base-100 border border-base-300 rounded-xl shadow-sm p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-base font-semibold">Recent Check History (Moderation)</h2>
            <button className="btn btn-xs btn-outline" onClick={fetchAdminData} disabled={actionLoading}>
              Refresh
            </button>
          </div>

          {isChecksLoading ? (
            <div className="py-4 text-center text-xs opacity-70">
              <span className="loading loading-spinner loading-xs mr-2" />
              Loading checks...
            </div>
          ) : checks.length === 0 ? (
            <p className="py-3 text-center text-xs opacity-70">No check history recorded yet.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-xs table-zebra w-full">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Timestamp</th>
                      <th>Label</th>
                      <th>Date</th>
                      <th>URL</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.slice(0, 15).map((check) => (
                      <tr key={`admin-check-${check.id}`} className="hover">
                        <td className="font-mono text-xs opacity-70">#{check.id}</td>
                        <td className="text-xs whitespace-nowrap">{formatCompactTimestamp(check.timestamp)}</td>
                        <td className="text-xs font-medium">{check.targetLabel}</td>
                        <td className="font-mono text-xs">{check.targetDate}</td>
                        <td className="text-xs max-w-[200px] truncate">{check.url}</td>
                        <td className="text-xs font-semibold">{check.price ? `€${check.price}` : '—'}</td>
                        <td>
                          <span className={`badge badge-xs ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                            {check.hasContent ? 'Found' : 'Not Found'}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDeleteCheck(check.id)}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-base-200">
                {checks.slice(0, 15).map((check) => (
                  <div key={`admin-check-mobile-${check.id}`} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">{check.targetLabel}</span>
                        <span className={`badge badge-xs ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                          {check.hasContent ? 'Found' : 'Not Found'}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-70 truncate">
                        #{check.id} · {formatCompactTimestamp(check.timestamp)} · {check.targetDate}
                      </div>
                    </div>
                    <button
                      className="btn btn-xs btn-outline btn-error flex-shrink-0"
                      onClick={() => handleDeleteCheck(check.id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <DBUsage dbSize={dbSize} />
      </main>
    </div>
  );
}
