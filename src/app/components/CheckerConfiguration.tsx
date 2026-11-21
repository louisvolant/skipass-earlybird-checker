// src/app/components/CheckerConfiguration.tsx
// Displays monitored configurations in either public read-only mode or full admin mode.

'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  getCheckerConfiguration,
  updateCheckerConfiguration,
  createCheckerConfiguration,
  deleteCheckerConfiguration,
  clearCache,
} from '@/lib/api';
import { buildConfigUpdatePayload } from '@/lib/dashboard-utils';
import { CheckerConfiguration as CheckerConfigType } from '@/lib/types';

interface CheckerConfigurationProps {
  readOnly?: boolean;
  onFetchConfigurations?: (configs: CheckerConfigType[]) => void;
}

const EMPTY_NEW_CONFIG: Omit<CheckerConfigType, 'id'> = {
  is_active: true,
  targetDate: '',
  targetLabel: '',
  targetUrl: '',
  is_mail_alert: false,
  mail_alert_address: '',
  mail_alert_contact: '',
};

export default function CheckerConfiguration({
  readOnly = true,
  onFetchConfigurations,
}: CheckerConfigurationProps) {
  const [configurations, setConfigurations] = useState<CheckerConfigType[]>([]);
  const [isConfigsLoading, setIsConfigsLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<CheckerConfigType | null>(null);
  const originalSelectedConfig = useRef<CheckerConfigType | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newConfig, setNewConfig] = useState<Omit<CheckerConfigType, 'id'>>(EMPTY_NEW_CONFIG);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(true);

  const fetchConfigurations = useCallback(
    async (activeOnly: boolean = showActiveOnly) => {
      try {
        setIsConfigsLoading(true);
        const response = await getCheckerConfiguration(activeOnly);
        const list: CheckerConfigType[] = response.success ? response.configurations || [] : [];
        setConfigurations(list);
        if (onFetchConfigurations) onFetchConfigurations(list);
      } catch (error) {
        console.error('Failed to fetch configurations:', error);
      } finally {
        setIsConfigsLoading(false);
      }
    },
    [showActiveOnly, onFetchConfigurations]
  );

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  const showNotice = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => setFeedbackMessage(null), 2500);
    }
  };

  const handleEditClick = (config: CheckerConfigType) => {
    setShowCreateForm(false);
    setSelectedConfig({ ...config });
    originalSelectedConfig.current = { ...config };
    setFeedbackMessage(null);
  };

  const handleEditFieldChange = (field: keyof CheckerConfigType, value: string | boolean) => {
    if (selectedConfig) {
      setSelectedConfig({ ...selectedConfig, [field]: value });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig || !originalSelectedConfig.current) return;

    const payload = buildConfigUpdatePayload(originalSelectedConfig.current, selectedConfig);
    if (Object.keys(payload).length === 0) {
      setSelectedConfig(null);
      originalSelectedConfig.current = null;
      return;
    }

    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await updateCheckerConfiguration(selectedConfig.id, payload);
      await clearCache();
      await fetchConfigurations();
      setSelectedConfig(null);
      originalSelectedConfig.current = null;
      showNotice('success', 'Configuration updated.');
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showNotice('error', apiError || 'Failed to update configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await createCheckerConfiguration(newConfig);
      await clearCache();
      await fetchConfigurations();
      setNewConfig(EMPTY_NEW_CONFIG);
      setShowCreateForm(false);
      showNotice('success', 'New site configuration added.');
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showNotice('error', apiError || 'Failed to create configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfig = async (configId: number) => {
    if (!confirm(`Delete configuration #${configId}?`)) return;
    setActionLoading(true);
    setFeedbackMessage(null);
    try {
      await deleteCheckerConfiguration(configId);
      await clearCache();
      await fetchConfigurations();
      if (selectedConfig?.id === configId) {
        setSelectedConfig(null);
        originalSelectedConfig.current = null;
      }
      showNotice('success', `Configuration #${configId} deleted.`);
    } catch (error: unknown) {
      const apiError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showNotice('error', apiError || 'Failed to delete configuration.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <section className="bg-base-100 border border-base-300 rounded-xl shadow-sm p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Monitored Configurations</h2>
          {readOnly ? (
            <span className="badge badge-ghost badge-xs">Read-Only</span>
          ) : (
            <span className="badge badge-primary badge-xs">Admin</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="label cursor-pointer py-0 gap-1.5">
            <span className="label-text text-xs">Active only</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
            />
          </label>

          {readOnly ? (
            <Link href="/admin" className="btn btn-xs btn-outline btn-primary">
              Manage
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-xs btn-primary"
              onClick={() => {
                setSelectedConfig(null);
                setFeedbackMessage(null);
                setShowCreateForm((prev) => !prev);
              }}
            >
              {showCreateForm ? 'Close' : '+ Add Site / Config'}
            </button>
          )}
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`alert ${feedbackMessage.type === 'success' ? 'alert-success' : 'alert-error'} py-2 px-3 mb-3 text-xs`}
        >
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Admin Create Form */}
      {!readOnly && showCreateForm && (
        <form onSubmit={handleCreateSubmit} className="mb-4 p-3 bg-base-200 rounded-lg space-y-3 border border-base-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Add New Site URL / Target</h3>
            <label className="label cursor-pointer py-0 gap-2">
              <span className="label-text text-xs">Active</span>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-success"
                checked={newConfig.is_active}
                onChange={(e) => setNewConfig({ ...newConfig, is_active: e.target.checked })}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="form-control md:col-span-3">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Site URL to Check</span>
              </label>
              <input
                type="url"
                className="input input-bordered input-sm w-full"
                placeholder="https://shop.resort.com/fr/skipass (leave blank for default env URL)"
                value={newConfig.targetUrl}
                onChange={(e) => setNewConfig({ ...newConfig, targetUrl: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Target Label *</span>
              </label>
              <input
                type="text"
                required
                className="input input-bordered input-sm w-full"
                placeholder="e.g. Val Cenis EarlyBird"
                value={newConfig.targetLabel}
                onChange={(e) => setNewConfig({ ...newConfig, targetLabel: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Target Date (YYYY-MM-DD) *</span>
              </label>
              <input
                type="date"
                required
                className="input input-bordered input-sm w-full"
                value={newConfig.targetDate}
                onChange={(e) => setNewConfig({ ...newConfig, targetDate: e.target.value })}
              />
            </div>

            <div className="form-control justify-end">
              <label className="label cursor-pointer justify-start gap-2 py-1">
                <input
                  type="checkbox"
                  className="toggle toggle-xs toggle-info"
                  checked={newConfig.is_mail_alert}
                  onChange={(e) => setNewConfig({ ...newConfig, is_mail_alert: e.target.checked })}
                />
                <span className="label-text text-xs">Enable Email Alert</span>
              </label>
            </div>

            {newConfig.is_mail_alert && (
              <>
                <div className="form-control md:col-span-2">
                  <label className="label py-0.5">
                    <span className="label-text text-xs font-medium">Alert Email Address</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="input input-bordered input-sm w-full"
                    placeholder="alerts@example.com"
                    value={newConfig.mail_alert_address}
                    onChange={(e) => setNewConfig({ ...newConfig, mail_alert_address: e.target.value })}
                  />
                </div>
                <div className="form-control">
                  <label className="label py-0.5">
                    <span className="label-text text-xs font-medium">Contact Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="input input-bordered input-sm w-full"
                    placeholder="Recipient name"
                    value={newConfig.mail_alert_contact}
                    onChange={(e) => setNewConfig({ ...newConfig, mail_alert_contact: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-xs btn-primary" disabled={actionLoading}>
              {actionLoading ? <span className="loading loading-spinner loading-xs" /> : 'Save New Site'}
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setShowCreateForm(false)}
              disabled={actionLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isConfigsLoading ? (
        <div className="py-4 text-center text-xs opacity-70">
          <span className="loading loading-spinner loading-xs mr-2" />
          Loading configurations...
        </div>
      ) : configurations.length === 0 ? (
        <p className="py-3 text-center text-xs opacity-70">No configurations match the current filter.</p>
      ) : (
        <>
          {/* Desktop compact table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-xs w-full">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Site URL</th>
                  <th>Target Date</th>
                  <th>Target Label</th>
                  <th>Alert</th>
                  {!readOnly && <th className="text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {configurations.map((config) => (
                  <tr key={`config-${config.id}`} className="hover">
                    <td className="font-mono text-xs opacity-70">#{config.id}</td>
                    <td>
                      <span className={`badge badge-xs ${config.is_active ? 'badge-success' : 'badge-ghost'}`}>
                        {config.is_active ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate text-xs" title={config.targetUrl || 'Default env URL'}>
                      {config.targetUrl ? (
                        <a
                          href={config.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link link-hover text-primary"
                        >
                          {config.targetUrl}
                        </a>
                      ) : (
                        <span className="opacity-60 italic">Default (env)</span>
                      )}
                    </td>
                    <td className="font-mono text-xs">{config.targetDate}</td>
                    <td className="font-medium text-xs">{config.targetLabel}</td>
                    <td className="text-xs">
                      {config.is_mail_alert ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="badge badge-info badge-xs">On</span>
                          {config.mail_alert_address && (
                            <span className="opacity-70 truncate max-w-[140px]">{config.mail_alert_address}</span>
                          )}
                        </span>
                      ) : (
                        <span className="badge badge-ghost badge-xs">Off</span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="text-right">
                        <div className="inline-flex gap-1">
                          <button
                            className="btn btn-xs btn-outline btn-accent"
                            onClick={() => handleEditClick(config)}
                            disabled={actionLoading}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDeleteConfig(config.id)}
                            disabled={actionLoading}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile compact cards */}
          <div className="md:hidden divide-y divide-base-200">
            {configurations.map((config) => (
              <div key={`config-mobile-${config.id}`} className="py-2 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-xs opacity-60">#{config.id}</span>
                    <span className="font-medium text-xs truncate">{config.targetLabel}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`badge badge-xs ${config.is_active ? 'badge-success' : 'badge-ghost'}`}>
                      {config.is_active ? 'Active' : 'Paused'}
                    </span>
                    <span className={`badge badge-xs ${config.is_mail_alert ? 'badge-info' : 'badge-ghost'}`}>
                      {config.is_mail_alert ? 'Mail On' : 'Mail Off'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs opacity-75">
                  <span className="font-mono">{config.targetDate}</span>
                  <span className="truncate max-w-[180px]">
                    {config.targetUrl || 'Default (env)'}
                  </span>
                </div>
                {!readOnly && (
                  <div className="flex justify-end gap-1.5 pt-1">
                    <button
                      className="btn btn-xs btn-outline btn-accent"
                      onClick={() => handleEditClick(config)}
                      disabled={actionLoading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-xs btn-outline btn-error"
                      onClick={() => handleDeleteConfig(config.id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Admin Update Form */}
      {!readOnly && selectedConfig && (
        <form onSubmit={handleUpdateSubmit} className="mt-4 p-3 bg-base-200 rounded-lg space-y-3 border border-base-300">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Edit Configuration #{selectedConfig.id}</h3>
            <label className="label cursor-pointer py-0 gap-2">
              <span className="label-text text-xs">Active</span>
              <input
                type="checkbox"
                className="toggle toggle-xs toggle-success"
                checked={selectedConfig.is_active}
                onChange={(e) => handleEditFieldChange('is_active', e.target.checked)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <div className="form-control md:col-span-3">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Site URL</span>
              </label>
              <input
                type="url"
                className="input input-bordered input-sm w-full"
                placeholder="https://shop.resort.com/fr/skipass (leave blank for default env URL)"
                value={selectedConfig.targetUrl || ''}
                onChange={(e) => handleEditFieldChange('targetUrl', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Target Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered input-sm w-full"
                value={selectedConfig.targetDate}
                onChange={(e) => handleEditFieldChange('targetDate', e.target.value)}
              />
            </div>

            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Target Label</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                value={selectedConfig.targetLabel}
                onChange={(e) => handleEditFieldChange('targetLabel', e.target.value)}
              />
            </div>

            <div className="form-control justify-end">
              <label className="label cursor-pointer justify-start gap-2 py-1">
                <input
                  type="checkbox"
                  className="toggle toggle-xs toggle-info"
                  checked={selectedConfig.is_mail_alert}
                  onChange={(e) => handleEditFieldChange('is_mail_alert', e.target.checked)}
                />
                <span className="label-text text-xs">Email Alert</span>
              </label>
            </div>

            <div className="form-control md:col-span-2">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Alert Email Address</span>
              </label>
              <input
                type="email"
                className="input input-bordered input-sm w-full"
                value={selectedConfig.mail_alert_address || ''}
                onChange={(e) => handleEditFieldChange('mail_alert_address', e.target.value)}
                disabled={!selectedConfig.is_mail_alert}
              />
            </div>

            <div className="form-control">
              <label className="label py-0.5">
                <span className="label-text text-xs font-medium">Alert Contact</span>
              </label>
              <input
                type="text"
                className="input input-bordered input-sm w-full"
                value={selectedConfig.mail_alert_contact || ''}
                onChange={(e) => handleEditFieldChange('mail_alert_contact', e.target.value)}
                disabled={!selectedConfig.is_mail_alert}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="submit" className="btn btn-xs btn-primary" disabled={actionLoading}>
              {actionLoading ? <span className="loading loading-spinner loading-xs" /> : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => {
                setSelectedConfig(null);
                originalSelectedConfig.current = null;
              }}
              disabled={actionLoading}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
