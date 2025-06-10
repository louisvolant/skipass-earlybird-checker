// src/app/components/CheckerConfiguration.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { getCheckerConfiguration, updateCheckerConfiguration, clearCache } from '@/lib/api';
import { CheckerConfiguration as CheckerConfigType } from '@/lib/types';

interface CheckerConfigurationProps {
  onFetchConfigurations?: () => void; // Optional callback to refresh parent state if needed
}

export default function CheckerConfiguration({ onFetchConfigurations }: CheckerConfigurationProps) {
  const [configurations, setConfigurations] = useState<CheckerConfigType[]>([]);
  const [isConfigsLoading, setIsConfigsLoading] = useState(true);
  const [selectedConfig, setSelectedConfig] = useState<CheckerConfigType | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const fetchConfigurations = async () => {
    try {
      console.log('Fetching configurations...');
      setIsConfigsLoading(true);
      const response = await getCheckerConfiguration();
      console.log('Configurations fetched:', response);
      setConfigurations(response.success ? response.configurations || [] : []);
      if (onFetchConfigurations) onFetchConfigurations(); // Notify parent if provided
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
    } finally {
      setIsConfigsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const handleUpdateClick = (config: CheckerConfigType) => {
    console.log('Selected Config:', config);
    setSelectedConfig(config);
    setUpdateSuccess(false);
    setIsDeactivating(false);
  };

  const handleConfigChange = (field: keyof CheckerConfigType, value: string | boolean) => {
    if (selectedConfig) {
      // If the 'is_active' field is being changed, set isDeactivating state
      if (field === 'is_active' && value === false) {
        setIsDeactivating(true);
      } else {
        setIsDeactivating(false); // Reset if activating or changing other fields
      }
      setSelectedConfig({ ...selectedConfig, [field]: value });
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConfig) return;

    setUpdateLoading(true);
    let payload: Partial<CheckerConfigType>;

    // If deactivating, only send `is_active` flag
    if (isDeactivating) {
      payload = { is_active: false };
    } else {
      // Otherwise, send all fields for a regular update
      payload = {
        is_active: selectedConfig.is_active,
        targetDate: selectedConfig.targetDate,
        targetLabel: selectedConfig.targetLabel,
        is_mail_alert: selectedConfig.is_mail_alert,
        mail_alert_address: selectedConfig.mail_alert_address,
        mail_alert_contact: selectedConfig.mail_alert_contact,
      };
    }

    try {
      await updateCheckerConfiguration(selectedConfig.id, payload);
      // After successful update, call the clearCache function from api.ts
      await clearCache(); // Moved the cache clearing call here
      await fetchConfigurations(); // Refresh the table
      setUpdateSuccess(true);
      setTimeout(() => {
        setSelectedConfig(null);
        setUpdateSuccess(false);
        setIsDeactivating(false); // Reset deactivation state
      }, 2000); // Auto-close after 2 seconds
    } catch (error) {
      console.error('Failed to update configuration:', error);
      alert('Failed to update configuration. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedConfig(null);
    setIsDeactivating(false);
  };

  return (
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
                <th>Active</th>
                <th>Target Date</th>
                <th>Target Label</th>
                <th>Mail Alert</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configurations.map((config) => (
                <tr key={`config-${config.id}`}>
                  <td>{config.id}</td>
                  <td>{config.is_active ? 'Yes' : 'No'}</td>
                  <td>{config.targetDate}</td>
                  <td>{config.targetLabel}</td>
                  <td>{config.is_mail_alert ? 'Yes' : 'No'}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline btn-accent"
                      onClick={() => handleUpdateClick(config)}
                    >
                      Update
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Update Form */}
      {selectedConfig && (
        <div className="mt-4 p-4 bg-base-300 rounded-lg">
          <h3 className="text-md font-semibold mb-4">Update Configuration (ID: {selectedConfig.id})</h3>
          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {/* First Row */}
              <div className="form-control space-y-2">
                <label className="label">
                  <span className="label-text">Active</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle ml-4"
                  checked={selectedConfig.is_active}
                  onChange={(e) => handleConfigChange('is_active', e.target.checked)}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target Date</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={selectedConfig.targetDate}
                  onChange={(e) => handleConfigChange('targetDate', e.target.value)}
                  disabled={isDeactivating}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target Label</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={selectedConfig.targetLabel}
                  onChange={(e) => handleConfigChange('targetLabel', e.target.value)}
                  disabled={isDeactivating}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
              {/* Second Row */}
              <div className="form-control space-y-2">
                <label className="label">
                  <span className="label-text">Mail Alert</span>
                </label>
                <input
                  type="checkbox"
                  className="toggle ml-4"
                  checked={selectedConfig.is_mail_alert}
                  onChange={(e) => handleConfigChange('is_mail_alert', e.target.checked)}
                  disabled={isDeactivating}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mail Alert Address</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={selectedConfig.mail_alert_address}
                  onChange={(e) => handleConfigChange('mail_alert_address', e.target.value)}
                  disabled={!selectedConfig.is_mail_alert || isDeactivating}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Mail Alert Contact</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={selectedConfig.mail_alert_contact || ''}
                  onChange={(e) => handleConfigChange('mail_alert_contact', e.target.value)}
                  disabled={!selectedConfig.is_mail_alert || isDeactivating}
                />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="submit" className="btn btn-primary" disabled={updateLoading}>
                {updateLoading ? <span className="loading loading-spinner"></span> : 'Update Configuration'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
                disabled={updateLoading}
              >
                Cancel
              </button>
              {updateSuccess && <span className="badge badge-success">Updated Successfully!</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}