// src/app/page.tsx
'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getLastChecks, forceCheck, getCheckContent } from "@/lib/api";

interface Check {
  id: number;
  timestamp: string;
  httpCode: string;
  url: string;
  targetDate: string;
  price: number | null;
  hasContent: boolean;
  showContent?: boolean;
  content?: any;
}


export default function Home() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Check; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'found' | 'notfound'>('all');
  const checksPerPage = 10;

  const fetchChecks = async () => {
    try {
      const data = await getLastChecks();
      setChecks(data);
    } catch (error) {
      console.error('Failed to fetch checks:', error);
    }
  };

  const handleForceCheck = async () => {
    setLoading(true);
    try {
      await forceCheck();
      await fetchChecks();
    } catch (error) {
      console.error('Failed to force check:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchChecks();
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  // Sorting function
  const handleSort = (key: keyof Check) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting
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

  // Apply filter
  const filteredChecks = sortedChecks.filter(check => {
    if (statusFilter === 'all') return true;
    return statusFilter === 'found' ? check.hasContent : !check.hasContent;
  });

  // Pagination
  const indexOfLastCheck = currentPage * checksPerPage;
  const indexOfFirstCheck = indexOfLastCheck - checksPerPage;
  const currentChecks = filteredChecks.slice(indexOfFirstCheck, indexOfLastCheck);
  const totalPages = Math.ceil(filteredChecks.length / checksPerPage);


const handleViewContent = async (checkId: number) => {
  const updatedChecks = checks.map(check => {
    if (check.id === checkId) {
      // Toggle content visibility if already loaded
      if (check.content) {
        return { ...check, showContent: !check.showContent };
      }
      // Load content if not already loaded
      return { ...check, showContent: true };
    }
    // Hide content for other rows
    return { ...check, showContent: false };
  });
  setChecks(updatedChecks);

  // Only fetch if content isn't already loaded
  const targetCheck = checks.find(c => c.id === checkId);
  if (!targetCheck?.content) {
    try {
      const content = await getCheckContent(checkId);
      const finalChecks = updatedChecks.map(check => {
        if (check.id === checkId) {
          return { ...check, content };
        }
        return check;
      });
      setChecks(finalChecks);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  }
};


  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar bg-base-100 shadow-lg">
        <div className="navbar-start">
          <div className="flex items-center px-4">
            <Image
              src="/icon.png"
              alt="SkiPass Checker Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <span className="text-xl font-bold">Skipass EarlyBird Checker</span>
          </div>
        </div>
        <div className="navbar-end">
          <button
            className="btn btn-ghost mr-2"
            onClick={handleRefresh}
            disabled={loading}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H0m0 0v5m0 0h4.582M12 12a8 8 0 018 8h-4m-4-12a8 8 0 00-8 8h4" />
            </svg>
          </button>
          <button
            className="btn btn-primary mr-4"
            onClick={handleForceCheck}
            disabled={loading}
          >
            {loading ? (
              <span className="loading loading-spinner"></span>
            ) : (
              'Force Check'
            )}
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
          <table className="table w-full">
            <thead>
              <tr>
                <th onClick={() => handleSort('timestamp')} className="cursor-pointer">
                  Timestamp {sortConfig?.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('httpCode')} className="cursor-pointer">
                  HTTP Code {sortConfig?.key === 'httpCode' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>
                 URL
                </th>
                <th onClick={() => handleSort('targetDate')} className="cursor-pointer">
                  Target Date {sortConfig?.key === 'targetDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('price')} className="cursor-pointer">
                  Price {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('hasContent')} className="cursor-pointer">
                  Status {sortConfig?.key === 'hasContent' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentChecks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">No checks match the current filter</td>
                </tr>
              ) : (
                  currentChecks.map((check) => (
                  <React.Fragment key={`check-${check.id}`}>
                    {/* Main row doesn't need a key since it's inside a keyed Fragment */}
                    <tr className="hover">
                      <td>{new Date(check.timestamp).toLocaleString()}</td>
                      <td>{check.httpCode}</td>
                      <td>{check.url}</td>
                      <td>{check.targetDate}</td>
                      <td>{check.price || '-'}</td>
                      <td>
                        <span className={`badge ${check.hasContent ? 'badge-success' : 'badge-error'}`}>
                          {check.hasContent ? 'Found' : 'Not Found'}
                        </span>
                      </td>
                      <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleViewContent(check.id)}
                          >
                            {check.showContent ? 'Hide Content' : 'View Content'}
                          </button>
                      </td>
                    </tr>
                    {/* Content row with its own unique key */}
                    {check.showContent && (
                      <tr key={`content-${check.id}`}>
                        <td colSpan={7} className="bg-base-200 p-4">
                          <div className="whitespace-pre-wrap">
                            {check.content ? (
                              <pre className="bg-base-300 p-4 rounded-lg">
                                {JSON.stringify(check.content, null, 2)}
                              </pre>
                            ) : (
                              <div className="loading loading-spinner"/>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))

              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
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
      </main>
    </div>
  );
}