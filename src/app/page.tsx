// src/app/page.tsx
// Public read-only dashboard displaying check history, database stats, and read-only configuration.

'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getLastChecks, getCheckContent, getDBSize } from '@/lib/api';
import {
  filterChecks,
  formatCompactTimestamp,
  sortChecks,
  type CheckSortConfig,
  type CheckStatusFilter,
} from '@/lib/dashboard-utils';
import { Check } from '@/lib/types';
import CheckerConfiguration from './components/CheckerConfiguration';
import DBUsage from './components/DBUsage';

export default function Home() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [isChecksLoading, setIsChecksLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<CheckSortConfig | null>(null);
  const [statusFilter, setStatusFilter] = useState<CheckStatusFilter>('all');
  const [expandedUrls, setExpandedUrls] = useState<{ [key: number]: boolean }>({});
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const checksPerPage = 10;

  const fetchDashboardData = useCallback(async () => {
    try {
      const [checksData, dbUsage] = await Promise.all([getLastChecks(), getDBSize()]);
      setChecks(checksData);
      setDbSize(dbUsage.size);
    } catch (error) {
      console.error('Failed to fetch public dashboard data:', error);
    } finally {
      setIsChecksLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewContent = async (checkId: number) => {
    if (selectedCheckId === checkId) {
      setSelectedCheckId(null);
      return;
    }

    setSelectedCheckId(checkId);
    const targetCheck = checks.find((c) => c.id === checkId);
    if (!targetCheck?.content) {
      try {
        const content = await getCheckContent(checkId);
        setChecks((prevChecks) =>
          prevChecks.map((check) => (check.id === checkId ? { ...check, content } : check))
        );
      } catch (error) {
        console.error('Failed to fetch content:', error);
        setSelectedCheckId(null);
      }
    }
  };

  const handleSort = (key: keyof Check) => {
    setSortConfig((prev) =>
      prev && prev.key === key && prev.direction === 'asc'
        ? { key, direction: 'desc' }
        : { key, direction: 'asc' }
    );
  };

  const toggleUrlExpand = (id: number) => {
    setExpandedUrls((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedChecks = sortChecks(checks, sortConfig);
  const filteredChecks = filterChecks(sortedChecks, statusFilter);
  const totalPages = Math.ceil(filteredChecks.length / checksPerPage);
  const indexOfLastCheck = currentPage * checksPerPage;
  const currentChecks = filteredChecks.slice(indexOfLastCheck - checksPerPage, indexOfLastCheck);

  const selectedCheck = checks.find((check) => check.id === selectedCheckId);
  const foundCount = checks.filter((c) => c.hasContent).length;
  const latestCheck = checks[0];

  return (
    <div className="min-h-screen flex flex-col bg-base-200/40">
      {/* Compact Header */}
      <header className="sticky top-0 z-20 bg-base-100/95 backdrop-blur border-b border-base-300">
        <div className="container mx-auto px-3 md:px-4 py-2.5 flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <Image src="/icon.png" alt="SkiPass Checker Logo" width={30} height={30} className="rounded" />
            <span className="text-base md:text-lg font-bold truncate">Skipass EarlyBird Checker</span>
            <span className="hidden sm:inline-flex badge badge-ghost badge-xs">Public</span>
          </Link>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              className="btn btn-xs sm:btn-sm btn-outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? <span className="loading loading-spinner loading-xs" /> : 'Refresh'}
            </button>
            <Link href="/admin" className="btn btn-xs sm:btn-sm btn-primary">
              Admin / Config
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-3 md:px-4 py-4 space-y-4">
        {/* Compact Summary Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-60">Total Checks</div>
            <div className="text-base font-bold">{isChecksLoading ? '—' : checks.length}</div>
          </div>
          <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-60">Deals Found</div>
            <div className="text-base font-bold text-success">{isChecksLoading ? '—' : foundCount}</div>
          </div>
          <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-60">Latest Run</div>
            <div className="text-xs sm:text-sm font-semibold truncate">
              {latestCheck ? formatCompactTimestamp(latestCheck.timestamp) : '—'}
            </div>
          </div>
          <div className="bg-base-100 border border-base-300 rounded-lg px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-60">D1 Storage</div>
            <div className="text-base font-bold">{dbSize || '—'}</div>
          </div>
        </div>

        {/* Check History Card */}
        <section className="bg-base-100 border border-base-300 rounded-xl shadow-sm p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h1 className="text-base font-semibold">Check History</h1>

            <div className="join">
              {(['all', 'found', 'notfound'] as const).map((filterValue) => (
                <button
                  key={filterValue}
                  className={`join-item btn btn-xs ${
                    statusFilter === filterValue ? 'btn-primary' : 'btn-ghost border border-base-300'
                  }`}
                  onClick={() => {
                    setStatusFilter(filterValue);
                    setCurrentPage(1);
                  }}
                >
                  {filterValue === 'all' ? 'All' : filterValue === 'found' ? 'Found' : 'Not Found'}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop compact table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-xs table-zebra w-full">
              <thead>
                <tr>
                  <th className="cursor-pointer" onClick={() => handleSort('timestamp')}>
                    Timestamp {sortConfig?.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="cursor-pointer" onClick={() => handleSort('httpCode')}>
                    HTTP {sortConfig?.key === 'httpCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="cursor-pointer" onClick={() => handleSort('targetDate')}>
                    Target Date {sortConfig?.key === 'targetDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="cursor-pointer" onClick={() => handleSort('targetLabel')}>
                    Target Label {sortConfig?.key === 'targetLabel' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>URL</th>
                  <th className="cursor-pointer" onClick={() => handleSort('price')}>
                    Price {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="cursor-pointer" onClick={() => handleSort('hasContent')}>
                    Status {sortConfig?.key === 'hasContent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {isChecksLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-xs opacity-70">
                      <span className="loading loading-spinner loading-xs mr-2" />
                      Loading checks...
                    </td>
                  </tr>
                ) : currentChecks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-xs opacity-70">
                      No checks match the current filter.
                    </td>
                  </tr>
                ) : (
                  currentChecks.map((check) => (
                    <tr key={`check-${check.id}-${check.timestamp}`} className="hover">
                      <td className="text-xs whitespace-nowrap">{formatCompactTimestamp(check.timestamp)}</td>
                      <td className="font-mono text-xs">{check.httpCode}</td>
                      <td className="font-mono text-xs whitespace-nowrap">{check.targetDate}</td>
                      <td className="text-xs font-medium">{check.targetLabel}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs ${expandedUrls[check.id] ? 'break-all' : 'max-w-[180px] truncate'}`}>
                            {check.url}
                          </span>
                          <button
                            className="btn btn-ghost btn-xs px-1 min-h-0 h-5"
                            onClick={() => toggleUrlExpand(check.id)}
                            title={expandedUrls[check.id] ? 'Collapse URL' : 'Expand URL'}
                          >
                            {expandedUrls[check.id] ? '−' : '+'}
                          </button>
                        </div>
                      </td>
                      <td className="text-xs font-semibold">{check.price ? `€${check.price}` : '—'}</td>
                      <td>
                        <span className={`badge badge-xs ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                          {check.hasContent ? 'Found' : 'Not Found'}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-xs btn-outline btn-accent"
                          onClick={() => handleViewContent(check.id)}
                        >
                          {selectedCheckId === check.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile compact list */}
          <div className="md:hidden divide-y divide-base-200">
            {isChecksLoading ? (
              <div className="py-4 text-center text-xs opacity-70">
                <span className="loading loading-spinner loading-xs mr-2" />
                Loading checks...
              </div>
            ) : currentChecks.length === 0 ? (
              <p className="py-4 text-center text-xs opacity-70">No checks match the current filter.</p>
            ) : (
              currentChecks.map((check) => (
                <div key={`check-mobile-${check.id}`} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate">{check.targetLabel || 'Unknown'}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {check.price && <span className="text-xs font-bold text-success">€{check.price}</span>}
                      <span className={`badge badge-xs ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                        {check.hasContent ? 'Found' : 'Not Found'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] opacity-70">
                    <span>{formatCompactTimestamp(check.timestamp)}</span>
                    <span className="font-mono">
                      {check.targetDate} · HTTP {check.httpCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      className="text-[11px] text-left opacity-75 truncate flex-1"
                      onClick={() => toggleUrlExpand(check.id)}
                    >
                      {expandedUrls[check.id] ? <span className="break-all whitespace-normal">{check.url}</span> : check.url}
                    </button>
                    <button
                      className="btn btn-xs btn-outline btn-accent flex-shrink-0"
                      onClick={() => handleViewContent(check.id)}
                    >
                      {selectedCheckId === check.id ? 'Hide' : 'View'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Compact Pagination */}
          {totalPages > 1 && !isChecksLoading && (
            <div className="flex justify-center mt-3">
              <div className="join">
                <button
                  className="join-item btn btn-xs"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  «
                </button>
                <button className="join-item btn btn-xs pointer-events-none">
                  {currentPage} / {totalPages}
                </button>
                <button
                  className="join-item btn btn-xs"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          )}

          {/* Selected Check HTML Content Viewer */}
          {selectedCheck && (
            <div className="mt-4 bg-base-200 border border-base-300 p-3 rounded-lg">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h2 className="text-xs sm:text-sm font-semibold truncate">
                  Check #{selectedCheck.id} — {formatCompactTimestamp(selectedCheck.timestamp)}
                </h2>
                <button className="btn btn-xs btn-ghost" onClick={() => setSelectedCheckId(null)}>
                  ✕
                </button>
              </div>
              <div className="text-xs opacity-75 mb-2 break-all">
                HTTP {selectedCheck.httpCode} · {selectedCheck.targetDate} · {selectedCheck.targetLabel || 'N/A'} ·{' '}
                {selectedCheck.url}
              </div>
              <div className="whitespace-pre-wrap text-xs overflow-auto max-h-80 bg-base-300 p-3 rounded">
                {selectedCheck.content ? (
                  <pre>{selectedCheck.content.contentData}</pre>
                ) : (
                  <span className="loading loading-spinner loading-xs" />
                )}
              </div>
            </div>
          )}
        </section>

        {/* Public Read-Only Checker Configuration */}
        <CheckerConfiguration readOnly={true} />

        <DBUsage dbSize={dbSize} />
      </main>
    </div>
  );
}
