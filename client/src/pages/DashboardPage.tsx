import React, { useEffect, useState } from 'react';
import {
  SparklesIcon,
  ArrowRightIcon,
  FolderIcon,
  ClockIcon,
  CheckCircleIcon,
  FilePlusIcon,
  EyeIcon,
} from '../components/common/Icons';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { Badge } from '../components/common/Badge';
import { Loading } from '../components/common/Loading';
import { draftApi } from '../services/draftApi';
import { listSubmittedClaims, SubmittedClaimRecord } from '../services/submissionApi';
import { FormDraft } from '../types/form';

interface DashboardPageProps {
  onStartNewClaim: () => void;
  onResumeDraft: (draftId: string) => void;
  onViewAllClaims: () => void;
  onViewClaimDetails: (claimId: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onStartNewClaim,
  onResumeDraft,
  onViewAllClaims,
  onViewClaimDetails,
}) => {
  const [activeDrafts, setActiveDrafts] = useState<FormDraft[]>([]);
  const [submittedClaims, setSubmittedClaims] = useState<SubmittedClaimRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadRealData = async () => {
      setIsLoading(true);
      try {
        const [draftsResult, submittedResult] = await Promise.all([
          draftApi.listDrafts('auto-insurance-claim'),
          listSubmittedClaims(),
        ]);

        if (draftsResult.success && draftsResult.drafts) {
          setActiveDrafts(draftsResult.drafts);
        }
        if (submittedResult) {
          setSubmittedClaims(submittedResult);
        }
      } catch {
        // Safe fallback
      } finally {
        setIsLoading(false);
      }
    };
    void loadRealData();
  }, []);

  const totalFilings = activeDrafts.length + submittedClaims.length;

  return (
    <div className="forma-page-container">
      {/* Hero Section: What can I do? */}
      <section className="forma-hero-card">
        <div className="forma-hero-content">
          <div className="forma-hero-badge">
            <SparklesIcon size={13} color="#38bdf8" />
            <span>AI-Augmented Intake</span>
          </div>
          <h1 className="forma-hero-title">Welcome to Forma AI</h1>
          <p className="forma-hero-desc">
            AI-assisted insurance claim intake engine. Describe what happened in plain English, and Forma AI will extract key details and dynamically generate the required questions.
          </p>
          <div className="forma-hero-actions">
            <Button
              variant="primary"
              size="md"
              icon={<SparklesIcon size={16} />}
              onClick={onStartNewClaim}
            >
              Start New Claim
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<FolderIcon size={16} />}
              onClick={onViewAllClaims}
            >
              View My Claims
            </Button>
          </div>
        </div>
      </section>

      {/* Real Data Status Overview: What needs attention & What have I done? */}
      {isLoading ? (
        <Loading message="Loading claim records..." />
      ) : totalFilings === 0 ? (
        <Card className="forma-empty-card">
          <EmptyState
            icon={<FolderIcon size={32} color="#64748b" />}
            title="No claims yet"
            description="Start your first claim to begin."
            actionLabel="Start New Claim"
            onAction={onStartNewClaim}
          />
        </Card>
      ) : (
        <div className="forma-dashboard-sections">
          {/* Section 1: In-Progress Drafts (What needs attention?) */}
          {activeDrafts.length > 0 && (
            <Card
              title={
                <div className="forma-section-header-title">
                  <ClockIcon size={18} color="#0ea5e9" />
                  <span>In-Progress Drafts ({activeDrafts.length})</span>
                </div>
              }
              subtitle="Unsubmitted claim drafts saved in local storage. Click resume to continue intake."
            >
              <div className="forma-drafts-list">
                {activeDrafts.map((draft) => {
                  const fieldCount = Object.keys(draft.values || {}).length;
                  const formattedDate = new Date(draft.updatedAt).toLocaleString();
                  return (
                    <div key={draft.draftId} className="forma-draft-row">
                      <div className="forma-draft-info">
                        <code className="forma-code-pill">{draft.draftId}</code>
                        <span className="forma-draft-meta">
                          Schema: {draft.schemaId} (v{draft.schemaVersion}) &middot; {fieldCount} field{fieldCount === 1 ? '' : 's'} entered
                        </span>
                        <span className="forma-draft-timestamp">Modified: {formattedDate}</span>
                      </div>
                      <div className="forma-draft-action">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<ArrowRightIcon size={14} />}
                          onClick={() => onResumeDraft(draft.draftId)}
                        >
                          Resume Draft
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Section 2: Recent Submitted Claims (What have I done?) */}
          {submittedClaims.length > 0 && (
            <Card
              title={
                <div className="forma-section-header-title">
                  <CheckCircleIcon size={18} color="#10b981" />
                  <span>Submitted Claims ({submittedClaims.length})</span>
                </div>
              }
              subtitle="Claims successfully submitted and validated by the intake engine."
              action={
                <Button variant="ghost" size="sm" onClick={onViewAllClaims}>
                  View All
                </Button>
              }
            >
              <div className="forma-table-wrap">
                <table className="forma-table">
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Schema</th>
                      <th>Date Submitted</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submittedClaims.slice(0, 5).map((claim) => (
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
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<EyeIcon size={14} />}
                            onClick={() => onViewClaimDetails(claim.submissionId)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Quick Actions Card */}
          <div className="forma-quick-bar">
            <span className="forma-quick-label">Ready to process another filing?</span>
            <Button
              variant="outline"
              size="sm"
              icon={<FilePlusIcon size={14} />}
              onClick={onStartNewClaim}
            >
              Start New Claim
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
