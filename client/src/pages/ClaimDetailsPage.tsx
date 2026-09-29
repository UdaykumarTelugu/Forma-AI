import React, { useState, useEffect } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FileTextIcon,
} from '../components/common/Icons';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Loading } from '../components/common/Loading';
import { getSubmittedClaim, SubmittedClaimRecord } from '../services/submissionApi';
import { useFormSchema } from '../hooks/useFormSchema';

interface ClaimDetailsPageProps {
  claimId: string;
  onBack: () => void;
}

export const ClaimDetailsPage: React.FC<ClaimDetailsPageProps> = ({ claimId, onBack }) => {
  const [claim, setClaim] = useState<SubmittedClaimRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { schema } = useFormSchema(claim?.schemaId || 'auto-insurance-claim');

  useEffect(() => {
    const fetchClaim = async () => {
      setLoading(true);
      try {
        const found = await getSubmittedClaim(claimId);
        setClaim(found);
      } catch {
        // Safe fallback
      } finally {
        setLoading(false);
      }
    };
    void fetchClaim();
  }, [claimId]);

  if (loading) {
    return <Loading message="Loading claim details..." fullPage />;
  }

  if (!claim) {
    return (
      <div className="forma-page-container">
        <div className="forma-page-header">
          <Button variant="outline" size="sm" icon={<ArrowLeftIcon size={14} />} onClick={onBack}>
            Back to My Claims
          </Button>
        </div>
        <Card className="forma-empty-card forma-mt-md">
          <h3 className="forma-empty-title">Claim Not Found</h3>
          <p className="forma-empty-desc">
            No record found for claim identifier &ldquo;{claimId}&rdquo;.
          </p>
        </Card>
      </div>
    );
  }

  const values = claim.values || {};
  const hasSections = Array.isArray(schema?.sections) && schema.sections.length > 0;

  return (
    <div className="forma-page-container">
      {/* Top Navigation */}
      <div className="forma-details-header">
        <Button variant="outline" size="sm" icon={<ArrowLeftIcon size={14} />} onClick={onBack}>
          Back to My Claims
        </Button>
        <div className="forma-details-status-row">
          <Badge variant="success" icon={<CheckCircleIcon size={13} />}>
            {claim.status}
          </Badge>
        </div>
      </div>

      {/* Hero Overview Card */}
      <Card className="forma-mt-md">
        <div className="forma-details-meta-grid">
          <div className="forma-details-meta-item">
            <span className="forma-detail-label">Claim Identifier</span>
            <code className="forma-code-pill forma-text-bold">{claim.submissionId}</code>
          </div>
          <div className="forma-details-meta-item">
            <span className="forma-detail-label">Form Schema</span>
            <span>{claim.schemaId} (v{claim.schemaVersion})</span>
          </div>
          <div className="forma-details-meta-item">
            <span className="forma-detail-label">Submission Date</span>
            <span>{new Date(claim.submittedAt).toLocaleString()}</span>
          </div>
          <div className="forma-details-meta-item">
            <span className="forma-detail-label">Total Fields Recorded</span>
            <span>{Object.keys(values).length} values captured</span>
          </div>
        </div>
      </Card>

      {/* Recorded Fields Section */}
      <div className="forma-details-content forma-mt-md">
        {hasSections ? (
          schema.sections!.map((section) => {
            const fieldsWithValues = section.fields?.filter((f) => values[f.name] !== undefined) || [];

            if (fieldsWithValues.length === 0) return null;

            return (
              <Card
                key={section.id}
                title={
                  <div className="forma-card-title-row">
                    <FileTextIcon size={16} color="#0ea5e9" />
                    <span>{section.title}</span>
                  </div>
                }
                className="forma-mt-md"
              >
                <div className="forma-details-fields-grid">
                  {fieldsWithValues.map((field) => (
                    <div key={field.id} className="forma-details-field-item">
                      <span className="forma-details-field-label">{field.label}</span>
                      <span className="forma-details-field-value">
                        {String(values[field.name])}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        ) : (
          <Card
            title={
              <div className="forma-card-title-row">
                <FileTextIcon size={16} color="#0ea5e9" />
                <span>Captured Form Data</span>
              </div>
            }
            className="forma-mt-md"
          >
            <div className="forma-details-fields-grid">
              {Object.entries(values).map(([k, v]) => (
                <div key={k} className="forma-details-field-item">
                  <span className="forma-details-field-label">{k}</span>
                  <span className="forma-details-field-value">{String(v)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClaimDetailsPage;
