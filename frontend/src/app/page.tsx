// src/app/page.tsx
'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getLastChecks, forceCheck, getCheckContent, deleteCheckContent, getDBSize } from '@/lib/api';
import { Check } from '@/lib/types';
import CheckerConfiguration from './components/CheckerConfiguration';
import DBUsage from './components/DBUsage';

export default function Home() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [isChecksLoading, setIsChecksLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Check; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'notfound'>('all');
  const [expandedUrls, setExpandedUrls] = useState<{ [key: number]: boolean }>({});
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const [dbSize, setDbSize] = useState<string | null>(null);
  const checksPerPage = 10;

  const fetchChecks = async () => {
    try {
      setIsChecksLoading(true);
      const [checksData, dbUsage] = await Promise.all([
        getLastChecks(),
        getDBSize()
      ]);
      setChecks(checksData);
      setDbSize(dbUsage.size);
    } catch (error) {
      console.error('Failed to fetch checks or DB size:', error);
    } finally {
      setIsChecksLoading(false);
    }
  };

  const handleForceCheck = async () => {
    setLoading(true);
    try {
      await forceCheck();
      await fetchChecks(); // Only fetch checks here, CheckerConfiguration handles its own data
    } catch (error) {
      console.error('Failed to force check:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [checksData, dbUsage] = await Promise.all([
        getLastChecks(),
        getDBSize()
      ]);
      setChecks(checksData);
      setDbSize(dbUsage.size);
    } catch (error) {
      console.error('Failed to refresh checks or DB size:', error);
      alert('Failed to refresh data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCheck = async (checkId: number) => {
    if (!confirm('Are you sure you want to delete this check?')) return;

    try {
      setLoading(true);
      await deleteCheckContent(checkId);
      setChecks(prevChecks => prevChecks.filter(check => check.id !== checkId));
      if (selectedCheckId === checkId) {
        setSelectedCheckId(null);
      }
    } catch (error) {
      console.error('Failed to delete check:', error);
      alert('Failed to delete check. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

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
          prevChecks.map((check) =>
            check.id === checkId ? { ...check, content } : check
          )
        );
      } catch (error) {
        console.error('Failed to fetch content:', error);
        setSelectedCheckId(null);
      }
    }
  };

  const handleSort = (key: keyof Check) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleUrlExpand = (id: number) => {
    setExpandedUrls(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedChecks = [...checks].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aValue = a[key];
    const bValue = b[key];
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    if (typeof aValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    }
    return direction === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  const filteredChecks = sortedChecks.filter(check => {
    if (statusFilter === 'all') return true;
    return statusFilter === 'found' ? check.hasContent : !check.hasContent;
  });

  const indexOfLastCheck = currentPage * checksPerPage;
  const indexOfFirstCheck = indexOfLastCheck - checksPerPage;
  const currentChecks = filteredChecks.slice(indexOfFirstCheck, indexOfLastCheck);
  const totalPages = Math.ceil(filteredChecks.length / checksPerPage);

  const selectedCheck = checks.find(check => check.id === selectedCheckId);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <div className="flex items-center px-4">
            <Image src="/icon.png" alt="SkiPass Checker Logo" width={40} height={40} className="mr-2" />
            <Link href="/" className="text-xl font-bold">Skipass EarlyBird Checker</Link>
          </div>
        </div>
        <div className="navbar-end">
          <button className="btn btn-info mr-2" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              'Refresh'
            )}
          </button>
          <button className="btn btn-warning mr-4" onClick={handleForceCheck} disabled={loading}>
            {loading ? <span className="loading loading-spinner"></span> : 'Force Check'}
          </button>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4">
        <div className="mb-4 flex justify-end">
          <select
            className="select select-bordered w-full max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'found' | 'notfound')}
          >
            <option value="all">All Status</option>
            <option value="found">Found Only</option>
            <option value="notfound">Not Found Only</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full table-zebra">
            <thead>
              <tr>
                <th className="cursor-pointer" onClick={() => handleSort('timestamp')}>
                  Timestamp {sortConfig?.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('httpCode')}>
                  HTTP Code {sortConfig?.key === 'httpCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('targetLabel')}>
                  Target Date {sortConfig?.key === 'targetLabel' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="cursor-pointer hidden md:table-cell" onClick={() => handleSort('targetDate')}>
                  Target Date {sortConfig?.key === 'targetDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>URL</th>
                <th className="cursor-pointer" onClick={() => handleSort('price')}>
                  Price {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="cursor-pointer" onClick={() => handleSort('hasContent')}>
                  Status {sortConfig?.key === 'hasContent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="hidden md:table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isChecksLoading ? (
                <tr><td colSpan={8} className="text-center"><span className="loading loading-spinner"></span> Loading checks...</td></tr>
              ) : currentChecks.length === 0 ? (
                <tr><td colSpan={8} className="text-center">No checks match the current filter</td></tr>
              ) : (
                currentChecks.map((check) => (
                  <tr key={`check-${check.id}-${check.timestamp}`} className="hover">
                    <td className="text-sm">{new Date(check.timestamp).toLocaleString()}</td>
                    <td className="hidden md:table-cell">{check.httpCode}</td>
                    <td className="hidden md:table-cell">{check.targetDate}</td>
                    <td className="hidden md:table-cell">{check.targetLabel}</td>
                    <td className="flex items-center">
                      <span className={`${expandedUrls[check.id] ? 'w-auto' : 'w-full max-w-[100px] md:max-w-[200px] truncate'}`}>
                        {check.url}
                      </span>
                      <button
                        className="ml-2 btn btn-xs btn-outline flex-shrink-0"
                        onClick={() => toggleUrlExpand(check.id)}
                      >
                        {expandedUrls[check.id] ? '-' : '+'}
                      </button>
                    </td>
                    <td>{check.price || '-'}</td>
                    <td className="text-center">
                      <span className={`badge ${check.hasContent ? 'badge-success' : 'badge-error'} w-full inline-block whitespace-nowrap overflow-hidden text-ellipsis`}>
                        {check.hasContent ? 'Found' : 'Not Found'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex gap-2">
                        <button
                          className="badge badge-outline badge-accent"
                          onClick={() => handleViewContent(check.id)}
                        >
                          {selectedCheckId === check.id ? 'Hide' : 'View'}
                        </button>
                        <button
                          className="badge badge-outline badge-error"
                          onClick={() => handleDeleteCheck(check.id)}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !isChecksLoading && (
          <div className="flex justify-center mt-4">
            <div className="join">
              <button
                className="join-item btn"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                «
              </button>
              <button className="join-item btn">
                Page {currentPage} of {totalPages}
              </button>
              <button
                className="join-item btn"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                »
              </button>
            </div>
          </div>
        )}

        {/* Content Display Section */}
        {selectedCheck && (
          <div className="mt-6 bg-base-200 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">
              Content for Check at {new Date(selectedCheck.timestamp).toLocaleString()} (URL: {selectedCheck.url})
            </h2>
            <div className="text-sm text-gray-600 mb-2">
              HTTP Code: {selectedCheck.httpCode} | Target Date: {selectedCheck.targetDate} | Target Label: {selectedCheck.targetLabel || 'N/A'} | Price: {selectedCheck.price || 'N/A'}
            </div>
            <div className="whitespace-pre-wrap text-xs overflow-auto max-h-96 bg-base-300 p-4 rounded-lg">
              {selectedCheck.content ? (
                <pre>{selectedCheck.content.contentData}</pre>
              ) : (
                <span className="loading loading-spinner"></span>
              )}
            </div>
          </div>
        )}

        {/* Checker Configuration and DB Usage Components */}
        <CheckerConfiguration />
        <DBUsage dbSize={dbSize} />
      </main>
    </div>
  );
}