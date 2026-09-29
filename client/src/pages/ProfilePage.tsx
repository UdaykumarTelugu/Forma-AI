import React, { useState, useEffect } from 'react';
import { UserIcon, FolderIcon } from '../components/common/Icons';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { listSubmittedClaims } from '../services/submissionApi';
import { draftApi } from '../services/draftApi';

export const ProfilePage: React.FC = () => {
  const [draftCount, setDraftCount] = useState<number>(0);
  const [submissionCount, setSubmissionCount] = useState<number>(0);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [draftsRes, subsRes] = await Promise.all([
          draftApi.listDrafts('auto-insurance-claim'),
          listSubmittedClaims(),
        ]);
        if (draftsRes.success && draftsRes.drafts) {
          setDraftCount(draftsRes.drafts.length);
        }
        if (subsRes) {
          setSubmissionCount(subsRes.length);
        }
      } catch {
        // Safe fallback
      }
    };
    void loadStats();
  }, []);

  return (
    <div className="forma-page-container">
      <div className="forma-page-header">
        <div>
          <h1 className="forma-page-title">Operator Profile</h1>
          <p className="forma-page-subtitle">
            Current session workstation identity and local intake activity.
          </p>
        </div>
      </div>

      <div className="forma-profile-grid">
        {/* User Identity Card */}
        <Card
          title={
            <div className="forma-card-title-row">
              <UserIcon size={18} color="#0ea5e9" />
              <span>Operator Session</span>
            </div>
          }
        >
          <div className="forma-profile-meta-list">
            <div className="forma-profile-row">
              <span className="forma-profile-key">Role</span>
              <span className="forma-profile-val">Claims Specialist / Operator</span>
            </div>
            <div className="forma-profile-row">
              <span className="forma-profile-key">Workspace Session</span>
              <span className="forma-profile-val">
                <Badge variant="success">Active</Badge>
              </span>
            </div>
            <div className="forma-profile-row">
              <span className="forma-profile-key">Intake Scope</span>
              <span className="forma-profile-val">Vehicle Insurance Claims Engine</span>
            </div>
            <div className="forma-profile-row">
              <span className="forma-profile-key">Authentication Architecture</span>
              <span className="forma-profile-val forma-text-muted">
                Client session mode (backend authentication not configured in current milestone)
              </span>
            </div>
          </div>
        </Card>

        {/* Local Storage & Activity Summary */}
        <Card
          title={
            <div className="forma-card-title-row">
              <FolderIcon size={18} color="#0ea5e9" />
              <span>Intake Activity (This Device)</span>
            </div>
          }
        >
          <div className="forma-profile-meta-list">
            <div className="forma-profile-row">
              <span className="forma-profile-key">Submitted Claims</span>
              <span className="forma-profile-val forma-text-bold">{submissionCount}</span>
            </div>
            <div className="forma-profile-row">
              <span className="forma-profile-key">In-Progress Drafts</span>
              <span className="forma-profile-val forma-text-bold">{draftCount}</span>
            </div>
            <div className="forma-profile-row">
              <span className="forma-profile-key">Local Data Storage</span>
              <span className="forma-profile-val">Browser LocalStorage</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
