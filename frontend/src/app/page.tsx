// src/app/page.tsx
'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getLastChecks, forceCheck, getCheckContent, getCheckerConfiguration } from "@/lib/api";

interface Check {
  id: number;
  timestamp: string;
  httpCode: string;
  url: string;
  targetDate: string;
  targetLabel: string;
  price: number | null;
  hasContent: boolean;
  content?: {
    contentData: string;
  };
}

interface CheckerConfiguration {
  id: number;
  targetDate: string;
  targetLabel: string;
}

export default function Home() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [configurations, setConfigurations] = useState<CheckerConfiguration[]>([]);
  const [isChecksLoading, setIsChecksLoading] = useState(true); // Separate loading state for checks
  const [isConfigsLoading, setIsConfigsLoading] = useState(true); // Separate loading state for configurations
  const [loading, setLoading] = useState(false); // For button actions
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Check; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'notfound'>('all');
  const [expandedUrls, setExpandedUrls] = useState<{ [key: number]: boolean }>({});
  const [selectedCheckId, setSelectedCheckId] = useState<number | null>(null);
  const checksPerPage = 10;

  const fetchChecks = async () => {
    try {
      setIsChecksLoading(true);
      const data = await getLastChecks();
      setChecks(data);
    } catch (error) {
      console.error('Failed to fetch checks:', error);
    } finally {
      setIsChecksLoading(false);
    }
  };

  const fetchConfigurations = async () => {
    try {
      setIsConfigsLoading(true);
      const response = await getCheckerConfiguration();
      setConfigurations(response.success ? response.configurations || [] : []);
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    } finally {
      setIsConfigsLoading(false);
    }
  };

  const handleForceCheck = async () => {
    setLoading(true);
    try {
      await forceCheck();
      await Promise.all([fetchChecks(), fetchConfigurations()]);
    } catch (error) {
      console.error('Failed to force check:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchChecks(), fetchConfigurations()]);
    } catch (error) {
      console.error('Failed to refresh checks:', error);
      alert('Failed to refresh checks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
    fetchConfigurations();
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

  // Sorting, filtering, and pagination logic remains unchanged
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
                  <tr key={`check-${check.id}`} className="hover">
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
                    <td>
                      <span className={`badge ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                        {check.hasContent ? 'Found' : 'Not Found'}
                      </span>
                    </td>
                    <td className="hidden md:table-cell">
                      <button
                        className="badge badge-outline badge-accent"
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

        {/* Checker Configuration Section */}
        <div className="mt-6 bg-base-200 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Checker Configuration</h2>
          {isConfigsLoading ? (
            <p className="text-gray-500"><span className="loading loading-spinner"></span> Loading configurations...</p>
          ) : configurations.length === 0 ? (
            <p className="text-gray-500">No active configurations found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Target Date</th>
                    <th>Target Label</th>
                  </tr>
                </thead>
                <tbody>
                  {configurations.map((config) => (
                    <tr key={`config-${config.id}`}>
                      <td>{config.id}</td>
                      <td>{config.targetDate}</td>
                      <td>{config.targetLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}