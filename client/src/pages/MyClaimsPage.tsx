import React, { useState, useEffect } from 'react';
import {
  FolderIcon,
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  EyeIcon,
  TrashIcon,
} from '../components/common/Icons';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { Loading } from '../components/common/Loading';
import { listSubmittedClaims, deleteSubmittedClaim, SubmittedClaimRecord } from '../services/submissionApi';
import { draftApi } from '../services/draftApi';
import { FormDraft } from '../types/form';

interface MyClaimsPageProps {
  onStartNewClaim: () => void;
  onResumeDraft: (draftId: string) => void;
  onViewClaimDetails: (claimId: string) => void;
}

export const MyClaimsPage: React.FC<MyClaimsPageProps> = ({
  onStartNewClaim,
  onResumeDraft,
  onViewClaimDetails,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'submitted' | 'drafts'>('all');
  const [submittedClaims, setSubmittedClaims] = useState<SubmittedClaimRecord[]>([]);
  const [drafts, setDrafts] = useState<FormDraft[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [submittedRes, draftsRes] = await Promise.all([
        listSubmittedClaims(),
        draftApi.listDrafts('auto-insurance-claim'),
      ]);
      setSubmittedClaims(submittedRes || []);
      if (draftsRes.success && draftsRes.drafts) {
        setDrafts(draftsRes.drafts);
      }
    } catch {
      // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleDeleteSubmitted = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete claim ${id}?`)) {
      await deleteSubmittedClaim(id);
      void loadAll();
    }
  };

  const handleDeleteDraft = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete draft ${draftId}?`)) {
      await draftApi.deleteDraft(draftId);
      void loadAll();
    }
  };

  const totalCount = submittedClaims.length + drafts.length;

  if (loading) {
    return <Loading message="Loading your claims..." fullPage />;
  }

  return (
    <div className="forma-page-container">
      {/* Page Header */}
      <div className="forma-page-header">
        <div>
          <h1 className="forma-page-title">My Claims</h1>
          <p className="forma-page-subtitle">
            Manage your submitted claim filings and in-progress intake drafts.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          icon={<SparklesIcon size={16} />}
          onClick={onStartNewClaim}
        >
          Start New Claim
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="forma-tab-bar" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`forma-tab-btn ${activeTab === 'all' ? 'forma-tab-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Filings ({totalCount})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'submitted'}
          className={`forma-tab-btn ${activeTab === 'submitted' ? 'forma-tab-active' : ''}`}
          onClick={() => setActiveTab('submitted')}
        >
          Submitted Claims ({submittedClaims.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'drafts'}
          className={`forma-tab-btn ${activeTab === 'drafts' ? 'forma-tab-active' : ''}`}
          onClick={() => setActiveTab('drafts')}
        >
          In-Progress Drafts ({drafts.length})
        </button>
      </div>

      {/* Main Content */}
      {totalCount === 0 ? (
        <Card className="forma-empty-card forma-mt-md">
          <EmptyState
            icon={<FolderIcon size={36} color="#64748b" />}
            title="No claims yet"
            description="Your submitted claims will appear here."
            actionLabel="Start New Claim"
            onAction={onStartNewClaim}
          />
        </Card>
      ) : (
        <div className="forma-claims-sections forma-mt-md">
          {/* Submitted Claims Table */}
          {(activeTab === 'all' || activeTab === 'submitted') && submittedClaims.length > 0 && (
            <Card
              title={
                <div className="forma-card-title-row">
                  <FolderIcon size={18} color="#0ea5e9" />
                  <span>Submitted Filings</span>
                </div>
              }
              subtitle="Claims submitted to the intake system."
            >
              <div className="forma-table-wrap">
                <table className="forma-table">
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Schema</th>
                      <th>Date Filed</th>
                      <th>Status</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedClaims.map((claim) => (
                      <tr key={claim.submissionId}>
                        <td>
                          <code className="forma-code-pill">{claim.submissionId}</code>
                        </td>
                        <td>{claim.schemaId}</td>
                        <td>{new Date(claim.submittedAt).toLocaleDateString()}</td>
                        <td>
                          <Badge variant="success">Submitted</Badge>
                        </td>
                        <td className="text-right">
                          <div className="forma-row-actions">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<EyeIcon size={14} />}
                              onClick={() => onViewClaimDetails(claim.submissionId)}
                            >
                              View Details
                            </Button>
                            <button
                              type="button"
                              className="forma-icon-btn forma-icon-btn-danger"
                              onClick={(e) => handleDeleteSubmitted(claim.submissionId, e)}
                              title="Delete record"
                              aria-label="Delete claim"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* In-Progress Drafts Section */}
          {(activeTab === 'all' || activeTab === 'drafts') && drafts.length > 0 && (
            <Card
              title={
                <div className="forma-card-title-row">
                  <ClockIcon size={18} color="#0ea5e9" />
                  <span>Saved In-Progress Drafts</span>
                </div>
              }
              subtitle="Unsubmitted claim drafts saved in local storage."
              className="forma-mt-md"
            >
              <div className="forma-drafts-list">
                {drafts.map((d) => (
                  <div key={d.draftId} className="forma-draft-row">
                    <div className="forma-draft-info">
                      <code className="forma-code-pill">{d.draftId}</code>
                      <span className="forma-draft-meta">
                        Schema: {d.schemaId} (v{d.schemaVersion}) &middot; {Object.keys(d.values || {}).length} field(s) saved
                      </span>
                      <span className="forma-draft-timestamp">
                        Modified: {new Date(d.updatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="forma-row-actions">
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<ArrowRightIcon size={14} />}
                        onClick={() => onResumeDraft(d.draftId)}
                      >
                        Resume Draft
                      </Button>
                      <button
                        type="button"
                        className="forma-icon-btn forma-icon-btn-danger"
                        onClick={(e) => handleDeleteDraft(d.draftId, e)}
                        title="Delete draft"
                        aria-label="Delete draft"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'submitted' && submittedClaims.length === 0 && (
            <Card className="forma-empty-card forma-mt-md">
              <EmptyState
                icon={<FolderIcon size={32} color="#64748b" />}
                title="No submitted claims"
                description="You haven't submitted any completed insurance claims yet."
                actionLabel="Start New Claim"
                onAction={onStartNewClaim}
              />
            </Card>
          )}

          {activeTab === 'drafts' && drafts.length === 0 && (
            <Card className="forma-empty-card forma-mt-md">
              <EmptyState
                icon={<ClockIcon size={32} color="#64748b" />}
                title="No drafts saved"
                description="You don't have any in-progress claim drafts saved."
                actionLabel="Start New Claim"
                onAction={onStartNewClaim}
              />
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default MyClaimsPage;
