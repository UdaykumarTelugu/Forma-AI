import React, { useState, useEffect } from 'react';
import {
  ShieldIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshIcon,
  TrashIcon,
} from '../components/common/Icons';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { apiClient } from '../services/api';
import { draftApi } from '../services/draftApi';
import { listSubmittedClaims, clearAllSubmittedClaims } from '../services/submissionApi';

export const SettingsPage: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    database: string;
    uptime?: number;
    error?: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  const [draftCount, setDraftCount] = useState<number>(0);
  const [submissionCount, setSubmissionCount] = useState<number>(0);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [draftsRes, subsRes] = await Promise.all([
        draftApi.listDrafts('auto-insurance-claim'),
        listSubmittedClaims(),
      ]);
      setDraftCount(draftsRes.success && draftsRes.drafts ? draftsRes.drafts.length : 0);
      setSubmissionCount(subsRes ? subsRes.length : 0);
    } catch {
      // Safe
    }
  };

  const checkBackendHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await apiClient.get('/health');
      if (res.data) {
        setHealthStatus(res.data);
      }
    } catch (err) {
      setHealthStatus({
        status: 'error',
        database: 'unknown',
        error: err instanceof Error ? err.message : 'Failed to reach health endpoint',
      });
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    void loadData();
    void checkBackendHealth();
  }, []);

  const handleClearDrafts = () => {
    if (window.confirm('Clear all saved local drafts? This cannot be undone.')) {
      draftApi._clearAllDrafts();
      void loadData();
      setNotice('All local drafts have been cleared.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  const handleClearSubmissions = () => {
    if (window.confirm('Clear all submitted claim records from this device?')) {
      clearAllSubmittedClaims();
      void loadData();
      setNotice('All submitted records have been cleared from local storage.');
      setTimeout(() => setNotice(null), 3000);
    }
  };

  return (
    <div className="forma-page-container">
      <div className="forma-page-header">
        <div>
          <h1 className="forma-page-title">Settings</h1>
          <p className="forma-page-subtitle">
            System diagnostics, backend connectivity, and local storage management.
          </p>
        </div>
      </div>

      {notice && (
        <div className="forma-success-toast forma-mb-md">
          <CheckCircleIcon size={16} color="#10b981" />
          <span>{notice}</span>
        </div>
      )}

      <div className="forma-settings-grid">
        {/* Backend Health Diagnostics */}
        <Card
          title={
            <div className="forma-card-title-row">
              <ShieldIcon size={18} color="#0ea5e9" />
              <span>Backend Engine Status</span>
            </div>
          }
          subtitle="Real-time connectivity to the Forma AI Express & MongoDB backend."
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<RefreshIcon size={14} />}
              isLoading={checkingHealth}
              onClick={checkBackendHealth}
            >
              Test Connection
            </Button>
          }
        >
          <div className="forma-settings-field-group">
            <div className="forma-settings-row">
              <span className="forma-settings-key">API Base URL</span>
              <code className="forma-code-pill">http://localhost:5000/api</code>
            </div>
            <div className="forma-settings-row">
              <span className="forma-settings-key">Server Status</span>
              {healthStatus?.status === 'ok' ? (
                <Badge variant="success" icon={<CheckCircleIcon size={12} />}>
                  Online ({healthStatus.status})
                </Badge>
              ) : healthStatus ? (
                <Badge variant="danger" icon={<AlertCircleIcon size={12} />}>
                  {healthStatus.error || healthStatus.status}
                </Badge>
              ) : (
                <Badge variant="neutral">Checking...</Badge>
              )}
            </div>
            <div className="forma-settings-row">
              <span className="forma-settings-key">MongoDB Database</span>
              {healthStatus?.database === 'connected' ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="warning">{healthStatus?.database || 'Disconnected'}</Badge>
              )}
            </div>
            {healthStatus?.uptime !== undefined && (
              <div className="forma-settings-row">
                <span className="forma-settings-key">Server Uptime</span>
                <span>{Math.round(healthStatus.uptime)} seconds</span>
              </div>
            )}
          </div>
        </Card>

        {/* AI Extraction Configuration */}
        <Card
          title={
            <div className="forma-card-title-row">
              <SparklesIcon size={18} color="#0ea5e9" />
              <span>AI Service Configuration</span>
            </div>
          }
          subtitle="Active extraction pipeline endpoint and model specifications."
        >
          <div className="forma-settings-field-group">
            <div className="forma-settings-row">
              <span className="forma-settings-key">Extraction Endpoint</span>
              <code className="forma-code-pill">POST /api/ai/extract</code>
            </div>
            <div className="forma-settings-row">
              <span className="forma-settings-key">Active Form Schema</span>
              <code className="forma-code-pill">auto-insurance-claim</code>
            </div>
            <div className="forma-settings-row">
              <span className="forma-settings-key">Extraction Strategy</span>
              <span>LangChain OpenAI Structured Output with Zod Schema Validation</span>
            </div>
            <div className="forma-settings-row">
              <span className="forma-settings-key">Human-in-the-Loop Mode</span>
              <Badge variant="neutral">Authoritative Manual Review Enabled</Badge>
            </div>
          </div>
        </Card>

        {/* Local Storage Management */}
        <Card
          title={
            <div className="forma-card-title-row">
              <TrashIcon size={18} color="#ef4444" />
              <span>Local Storage Management</span>
            </div>
          }
          subtitle="Manage saved drafts and local intake records on this workstation."
        >
          <div className="forma-settings-field-group">
            <div className="forma-storage-row">
              <div>
                <strong>In-Progress Drafts</strong>
                <p className="forma-text-muted">
                  {draftCount} local draft{draftCount === 1 ? '' : 's'} stored in browser storage.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={draftCount === 0}
                onClick={handleClearDrafts}
              >
                Clear Drafts
              </Button>
            </div>

            <div className="forma-storage-row forma-mt-md">
              <div>
                <strong>Submitted Claims History</strong>
                <p className="forma-text-muted">
                  {submissionCount} record{submissionCount === 1 ? '' : 's'} stored on this workstation.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={submissionCount === 0}
                onClick={handleClearSubmissions}
              >
                Clear Records
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
