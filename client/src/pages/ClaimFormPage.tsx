import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useFormSchema } from '../hooks/useFormSchema';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { DynamicForm } from '../components/dynamic-form/DynamicForm';
import { MagicInput } from '../components/ai/MagicInput';
import {
  mapExtractionToFormFields,
  getAllSchemaFields,
  ExtractionMappingSummary,
} from '../utils/aiFormMapping';
import { filterActiveVisibleFields } from '../utils/conditionalLogic';
import { computeFormReadiness, cleanSubmissionPayload } from '../utils/validation';
import { useAiSuggestionStore } from '../stores/aiSuggestionStore';
import { ClaimExtractionResult } from '../types/ai';
import { FormValues, FormSubmissionPayload, SubmissionStatus, FormDraft } from '../types/form';
import { submitClaimForm } from '../services/submissionApi';
import { draftApi, checkDraftCompatibility } from '../services/draftApi';

/**
 * ClaimFormPage - Integrates Form Schema API, MagicInput AI extraction,
 * and DynamicForm renderer with Human-in-the-Loop review and field-level feedback.
 *
 * Human-in-the-Loop Flow:
 * 1. User inputs unstructured claim description.
 * 2. AI extracts candidate facts based on active MongoDB FormSchema.
 * 3. Schema-driven mapping checks compatibility and respects manual user edits.
 * 4. Compatible fields are applied to React Hook Form and marked with accessible AI badges.
 * 5. Extraction review banner summarizes populated fields, missing required fields, and rejected values.
 * 6. "Review AI fields" interaction allows 1-click jump to AI-populated fields.
 * 7. Any manual edit immediately transitions the field to reviewed state.
 * 8. User can clear AI markers without erasing values, or reset the entire form.
 */
export const ClaimFormPage: React.FC = () => {
  const { schema, loading, error, refetch } = useFormSchema('auto-insurance-claim');
  const [reviewSummary, setReviewSummary] = useState<ExtractionMappingSummary | null>(null);
  const [submissionBlockedMessage, setSubmissionBlockedMessage] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [finalSubmissionPayload, setFinalSubmissionPayload] = useState<FormSubmissionPayload | null>(null);

  // Draft Management State (Week 4 Step 1)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const [activeDraftUpdatedAt, setActiveDraftUpdatedAt] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftFeedback, setDraftFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);
  const [isDraftsPanelOpen, setIsDraftsPanelOpen] = useState<boolean>(false);
  const [savedDrafts, setSavedDrafts] = useState<FormDraft[]>([]);

  const {
    setAiSuggestions,
    clearAiMarkers,
    reset: resetAiStore,
    confirmAllAiSuggestions,
    userModifiedFields,
    aiSuggestedFields,
    userReviewedFields,
  } = useAiSuggestionStore();

  const form = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: {},
    shouldUnregister: true,
  });

  const allSchemaFields = useMemo(
    () => (schema ? getAllSchemaFields(schema) : []),
    [schema]
  );

  // Watch current form values for real-time validation and conditional calculations
  const currentValues = form.watch();

  // Active unreviewed AI fields (suggested by AI, but not yet reviewed/edited/confirmed)
  const unreviewedAiFieldNames = useMemo(() => {
    return Object.keys(aiSuggestedFields).filter(
      (fieldName) => !userReviewedFields[fieldName] && !userModifiedFields[fieldName]
    );
  }, [aiSuggestedFields, userReviewedFields, userModifiedFields]);

  // Active fields dynamically filtered by conditional visibility engine (hierarchical)
  const activeVisibleFields = useMemo(() => {
    if (!schema || allSchemaFields.length === 0) return [];
    return filterActiveVisibleFields(allSchemaFields, currentValues);
  }, [schema, allSchemaFields, currentValues]);

  // Unified Form Readiness derived from schema, active fields, current values, RHF errors, and unreviewed AI suggestions
  const formReadiness = useMemo(() => {
    return computeFormReadiness(
      activeVisibleFields,
      currentValues,
      form.formState.errors,
      unreviewedAiFieldNames
    );
  }, [activeVisibleFields, currentValues, form.formState.errors, unreviewedAiFieldNames]);

  const missingRequiredFields = formReadiness.missingRequired;

  const handleAiAutofill = async (extractionResult: ClaimExtractionResult) => {
    if (!schema) return;

    // Map extraction safely against schema with user edit protection
    const mappingSummary = mapExtractionToFormFields(schema, extractionResult, {
      userModifiedFields,
      currentValues: form.getValues(),
    });

    // Apply valid candidate values into React Hook Form
    for (const item of mappingSummary.applied) {
      form.setValue(item.fieldName, item.value, {
        shouldValidate: true,
        shouldDirty: false,
        shouldTouch: true,
      });
    }

    // Trigger validation pass so all candidate values participate in RHF validation
    await form.trigger();

    // Register applied fields in suggestion metadata store
    const suggestionsMap: Record<string, unknown> = {};
    for (const item of mappingSummary.applied) {
      suggestionsMap[item.fieldName] = item.value;
    }
    setAiSuggestions(suggestionsMap);

    setReviewSummary(mappingSummary);
    setFinalSubmissionPayload(null);
    setSubmissionBlockedMessage(null);
    setSubmissionError(null);
    setSubmissionStatus('idle');
  };

  const handleClearMarkers = () => {
    clearAiMarkers();
  };

  const handleResetEntireForm = () => {
    form.reset();
    resetAiStore();
    setReviewSummary(null);
    setFinalSubmissionPayload(null);
    setSubmissionBlockedMessage(null);
    setSubmissionError(null);
    setSubmissionStatus('idle');
    setActiveDraftId(null);
    setActiveDraftUpdatedAt(null);
    setDraftFeedback(null);
  };

  // Load saved drafts for active schema
  const loadSavedDrafts = useCallback(async () => {
    if (!schema) return;
    const result = await draftApi.listDrafts(schema.schemaId);
    if (result.success) {
      setSavedDrafts(result.drafts);
    }
  }, [schema]);

  useEffect(() => {
    void loadSavedDrafts();
  }, [loadSavedDrafts]);

  // Save current progress as draft without submission or required-field gates
  const handleSaveDraft = async () => {
    if (!schema) return;
    setIsSavingDraft(true);
    setDraftFeedback(null);

    try {
      const currentFormData = form.getValues();
      const result = await draftApi.saveDraft({
        draftId: activeDraftId || undefined,
        schemaId: schema.schemaId,
        schemaVersion: schema.version,
        values: currentFormData,
      });

      if (result.success && result.draft) {
        setActiveDraftId(result.draft.draftId);
        setActiveDraftUpdatedAt(result.draft.updatedAt);
        setDraftFeedback({
          type: 'success',
          message: `Draft saved successfully (${result.draft.draftId}) at ${new Date(result.draft.updatedAt).toLocaleTimeString()}.`,
        });
        await loadSavedDrafts();
      } else {
        setDraftFeedback({
          type: 'error',
          message: result.error || 'Failed to save draft.',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving the draft.';
      setDraftFeedback({ type: 'error', message: msg });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Resume a previously saved draft
  const handleResumeDraft = async (draftId: string) => {
    if (!schema) return;
    setDraftFeedback(null);

    const result = await draftApi.getDraft(draftId);
    if (!result.success || !result.draft) {
      setDraftFeedback({
        type: 'error',
        message: result.error || 'Could not retrieve draft.',
      });
      return;
    }

    const draft = result.draft;
    const compat = checkDraftCompatibility(draft, schema.schemaId, schema.version);

    if (!compat.compatible) {
      setDraftFeedback({
        type: 'error',
        message: compat.message || 'Draft is incompatible with the current form schema.',
      });
      return;
    }

    // Restore values into React Hook Form
    form.reset(draft.values);
    // Re-run validation logic
    await form.trigger();

    setActiveDraftId(draft.draftId);
    setActiveDraftUpdatedAt(draft.updatedAt);
    setIsDraftsPanelOpen(false);
    setSubmissionBlockedMessage(null);
    setSubmissionError(null);
    setFinalSubmissionPayload(null);
    setReviewSummary(null);

    if (compat.status === 'version_mismatch') {
      setDraftFeedback({
        type: 'warning',
        message: compat.message!,
      });
    } else {
      setDraftFeedback({
        type: 'success',
        message: `Draft ${draft.draftId} resumed. Restored previously entered values.`,
      });
    }
  };

  // Delete a draft
  const handleDeleteDraft = async (draftId: string) => {
    const result = await draftApi.deleteDraft(draftId);
    if (result.success) {
      if (activeDraftId === draftId) {
        setActiveDraftId(null);
        setActiveDraftUpdatedAt(null);
      }
      await loadSavedDrafts();
      setDraftFeedback({
        type: 'info',
        message: `Draft ${draftId} was deleted.`,
      });
    } else {
      setDraftFeedback({
        type: 'error',
        message: result.error || 'Failed to delete draft.',
      });
    }
  };

  const handleStartFresh = () => {
    handleResetEntireForm();
    setActiveDraftId(null);
    setActiveDraftUpdatedAt(null);
    setDraftFeedback(null);
    setIsDraftsPanelOpen(false);
  };

  const handleReviewAiFields = useCallback(() => {
    const firstSuggestedField = Object.keys(aiSuggestedFields).find(
      (name) => !userModifiedFields[name]
    );
    if (firstSuggestedField) {
      const target =
        document.querySelector(`[data-field-name="${firstSuggestedField}"]`) ||
        document.getElementById(`field-container-${firstSuggestedField}`) ||
        document.getElementById(firstSuggestedField);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = target.querySelector('input, select, textarea') as HTMLElement | null;
        if (input) {
          input.focus();
        }
      }
    }
  }, [aiSuggestedFields, userModifiedFields]);

  const handleFormSubmit = async (data: FormValues) => {
    if (!schema) return;

    // 1. Prevent double submission
    if (submissionStatus === 'submitting') {
      return;
    }

    // 2. Final Submission Guard: independently verify readiness
    if (formReadiness.status !== 'READY') {
      if (formReadiness.activeErrors.length > 0) {
        setSubmissionBlockedMessage(
          `Submission blocked: Please resolve ${formReadiness.activeErrors.length} field error(s) before submitting.`
        );
      } else if (formReadiness.missingRequired.length > 0) {
        setSubmissionBlockedMessage(
          `Submission blocked: ${formReadiness.missingRequired.length} required field(s) still need to be completed.`
        );
      } else if (formReadiness.unreviewedAiFields.length > 0) {
        setSubmissionBlockedMessage(
          `Submission blocked: Please review the ${formReadiness.unreviewedAiFields.length} field(s) suggested by AI before submitting.`
        );
      } else {
        setSubmissionBlockedMessage('Submission blocked: Form is not ready for submission.');
      }
      setSubmissionStatus('idle');
      return;
    }

    setSubmissionBlockedMessage(null);
    setSubmissionError(null);
    setSubmissionStatus('submitting');

    try {
      // 3. Payload Cleanup: retain only currently active visible fields
      const cleanedValues = cleanSubmissionPayload(data, activeVisibleFields);

      // 4. Construct final typed submission payload contract
      const payload: FormSubmissionPayload = {
        schemaId: schema.schemaId,
        schemaVersion: schema.version,
        values: cleanedValues,
        submittedAt: new Date().toISOString(),
      };

      // 5. Submit via typed service abstraction
      const result = await submitClaimForm(payload);

      if (result.success) {
        setFinalSubmissionPayload(result.payload || payload);
        setSubmissionStatus('success');

        // Week 4 Step 1: Successfully submitted draft should no longer remain an active editable draft
        if (activeDraftId) {
          await draftApi.deleteDraft(activeDraftId);
          setActiveDraftId(null);
          setActiveDraftUpdatedAt(null);
          await loadSavedDrafts();
        }
      } else {
        setSubmissionError(result.error || 'Submission failed. Please try again.');
        setSubmissionStatus('error');
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred during submission.';
      setSubmissionError(msg);
      setSubmissionStatus('error');
    }
  };

  // Pre-submission review summary checklist node
  const reviewSummaryNode = useMemo(() => {
    const hasErrors = formReadiness.activeErrors.length > 0;
    const hasMissing = formReadiness.missingRequired.length > 0;
    const hasUnreviewed = formReadiness.unreviewedAiFields.length > 0;
    const isReady = formReadiness.status === 'READY';

    const activeReviewedAiCount = Object.keys(userReviewedFields).filter((name) =>
      activeVisibleFields.some((f) => f.name === name)
    ).length;

    return (
      <div className="submission-review-summary" role="region" aria-label="Pre-submission review checklist">
        <div className="review-summary-header">
          <span className="review-summary-title">Form Review</span>
          <span className={`review-summary-badge ${isReady ? 'badge-ready' : 'badge-action'}`}>
            {isReady ? '✓ Ready for Submission' : '⚠ Action Required'}
          </span>
        </div>

        <ul className="review-checklist" aria-label="Readiness criteria">
          <li className={`checklist-item ${hasMissing ? 'item-incomplete' : 'item-complete'}`}>
            <span className="item-icon" aria-hidden="true">{hasMissing ? '○' : '✓'}</span>
            <span className="item-text">
              {hasMissing
                ? `${formReadiness.missingRequired.length} required field(s) still need to be completed`
                : 'All required fields complete'}
            </span>
          </li>

          <li className={`checklist-item ${hasErrors ? 'item-error' : 'item-complete'}`}>
            <span className="item-icon" aria-hidden="true">{hasErrors ? '⚠️' : '✓'}</span>
            <span className="item-text">
              {hasErrors
                ? `${formReadiness.activeErrors.length} field(s) require review or correction`
                : 'No validation errors'}
            </span>
          </li>

          <li className={`checklist-item ${hasUnreviewed ? 'item-warning' : 'item-complete'}`}>
            <span className="item-icon" aria-hidden="true">{hasUnreviewed ? '⚠️' : '✓'}</span>
            <span className="item-text">
              {hasUnreviewed
                ? `${formReadiness.unreviewedAiFields.length} AI suggestion(s) need review`
                : activeReviewedAiCount > 0
                ? `All AI suggestions reviewed (${activeReviewedAiCount} confirmed)`
                : 'All AI suggestions reviewed'}
            </span>
            {hasUnreviewed && (
              <button
                type="button"
                className="checklist-review-btn"
                onClick={handleReviewAiFields}
                title="Jump to the first unreviewed AI suggestion"
              >
                Review AI Fields
              </button>
            )}
          </li>
        </ul>
      </div>
    );
  }, [formReadiness, userReviewedFields, activeVisibleFields, handleReviewAiFields]);

  const activeAiMarkerCount = Object.keys(aiSuggestedFields).filter(
    (fieldName) => !userModifiedFields[fieldName]
  ).length;

  if (loading) {
    return (
      <div className="claim-page-loading" style={{ padding: '2rem', textAlign: 'center' }}>
        <Loading message="Loading auto-insurance-claim schema from API..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="claim-page-error" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2>Unable to Load Form</h2>
        <ErrorMessage message={error} onRetry={refetch} />
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ padding: '2rem' }}>
        <p>No schema available.</p>
      </div>
    );
  }

  return (
    <div className="claim-form-page" style={{ maxWidth: '840px', margin: '0 auto', padding: '1.5rem' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Forma AI &middot; Dynamic Form Engine
            </span>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
                Schema: <strong>{schema.schemaId}</strong>
              </span>
              <span style={{ background: '#f0fdf4', color: '#15803d', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
                v{schema.version}
              </span>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
                {schema.fields?.length || 0} Fields
              </span>
              <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.8rem' }}>
                {schema.sections?.length || 0} Sections
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="drafts-toggle-btn"
              onClick={() => setIsDraftsPanelOpen((prev) => !prev)}
              title="View and manage saved drafts"
              style={{
                padding: '0.5rem 0.85rem',
                backgroundColor: isDraftsPanelOpen ? '#e0f2fe' : '#ffffff',
                border: '1.5px solid #38bdf8',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#0369a1',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span aria-hidden="true">📁</span>
              <span>Saved Drafts</span>
              <span
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {savedDrafts.length}
              </span>
            </button>

            {activeDraftId && (
              <button
                type="button"
                onClick={handleStartFresh}
                style={{
                  padding: '0.5rem 0.85rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: '#475569',
                  fontWeight: 500,
                }}
                title="Discard active draft view and start with a blank form"
              >
                + Start Blank Form
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleResetEntireForm();
                void refetch();
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#334155',
                fontWeight: 500,
              }}
            >
              Refetch Schema
            </button>
          </div>
        </div>
      </header>

      {/* Week 4 Step 1: Drafts List Drawer / Modal */}
      {isDraftsPanelOpen && (
        <div className="drafts-drawer-backdrop" onClick={() => setIsDraftsPanelOpen(false)}>
          <div
            className="drafts-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Saved Form Drafts"
          >
            <div className="drafts-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📁</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>
                  Saved Form Drafts ({savedDrafts.length})
                </h3>
              </div>
              <button
                type="button"
                className="drafts-panel-close-btn"
                onClick={() => setIsDraftsPanelOpen(false)}
                aria-label="Close drafts panel"
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.5rem 0 1rem 0' }}>
              Drafts for schema <strong>{schema.schemaId}</strong> (v{schema.version}). Resuming a draft restores previously entered values and re-evaluates validation and conditional rules.
            </p>

            {savedDrafts.length === 0 ? (
              <div className="drafts-empty-state">
                <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600 }}>No saved drafts found.</p>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Click &ldquo;Save Draft&rdquo; below the form anytime to preserve your current progress.
                </span>
              </div>
            ) : (
              <div className="drafts-list">
                {savedDrafts.map((d) => {
                  const isActive = d.draftId === activeDraftId;
                  const fieldCount = Object.keys(d.values || {}).length;
                  const isVersionMismatch = d.schemaVersion !== schema.version;

                  return (
                    <div
                      key={d.draftId}
                      className={`draft-item ${isActive ? 'draft-item-active' : ''}`}
                    >
                      <div className="draft-item-info">
                        <div className="draft-item-title-row">
                          <code className="draft-id-badge">{d.draftId}</code>
                          {isActive && <span className="active-tag">Currently Loaded</span>}
                          {isVersionMismatch && (
                            <span className="version-mismatch-tag">
                              v{d.schemaVersion} (current: v{schema.version})
                            </span>
                          )}
                        </div>
                        <div className="draft-item-meta">
                          <span>Updated: {new Date(d.updatedAt).toLocaleString()}</span>
                          <span>&middot;</span>
                          <span>{fieldCount} field{fieldCount === 1 ? '' : 's'} saved</span>
                        </div>
                      </div>

                      <div className="draft-item-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary resume-draft-btn"
                          onClick={() => void handleResumeDraft(d.draftId)}
                          disabled={isActive}
                          title={isActive ? 'This draft is already loaded' : 'Resume editing this draft'}
                        >
                          {isActive ? 'Loaded' : 'Resume'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger delete-draft-btn"
                          onClick={() => void handleDeleteDraft(d.draftId)}
                          title="Delete this draft permanently"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="drafts-panel-footer">
              <button
                type="button"
                className="btn btn-secondary start-fresh-btn"
                onClick={handleStartFresh}
              >
                + Start Blank Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Action Feedback Banner */}
      {draftFeedback && (
        <div
          className={`draft-feedback-banner feedback-${draftFeedback.type}`}
          role="status"
          aria-live="polite"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span aria-hidden="true" style={{ fontSize: '1.1rem' }}>
              {draftFeedback.type === 'success' && '✓'}
              {draftFeedback.type === 'warning' && '⚠'}
              {draftFeedback.type === 'error' && '🚫'}
              {draftFeedback.type === 'info' && 'ℹ️'}
            </span>
            <span>{draftFeedback.message}</span>
          </div>
          <button
            type="button"
            className="feedback-dismiss-btn"
            onClick={() => setDraftFeedback(null)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Currently Active Resumed Draft Indicator */}
      {activeDraftId && (
        <div className="active-draft-banner" role="status">
          <div className="active-draft-details">
            <span className="active-draft-icon" aria-hidden="true">📄</span>
            <span>
              <strong>Editing Draft:</strong> <code>{activeDraftId}</code>
              {activeDraftUpdatedAt && (
                <span className="active-draft-time">
                  &nbsp;&middot;&nbsp;Last saved: {new Date(activeDraftUpdatedAt).toLocaleTimeString()}
                </span>
              )}
            </span>
          </div>
          <div className="active-draft-actions">
            <button
              type="button"
              className="active-draft-new-btn"
              onClick={handleStartFresh}
              title="Discard draft view and start fresh"
            >
              Start Blank Form
            </button>
          </div>
        </div>
      )}

      {/* Week 2: AI Magic Input Box */}
      <MagicInput schemaId={schema.schemaId} onExtractSuccess={handleAiAutofill} />

      {/* Week 3: Unified Form Readiness Banner */}
      <div
        className={`form-readiness-banner readiness-${formReadiness.status.toLowerCase().replace(/\s+/g, '-')}`}
        role="region"
        aria-label="Form validation and submission readiness"
      >
        <div className="readiness-main">
          <div className="readiness-badge-group">
            <span className="readiness-label">Form Readiness:</span>
            <span
              className={`readiness-pill readiness-pill-${formReadiness.status.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {formReadiness.status === 'READY' && '✓ READY'}
              {formReadiness.status === 'NEEDS REVIEW' && '⚠ NEEDS REVIEW'}
              {formReadiness.status === 'INCOMPLETE' && '○ INCOMPLETE'}
            </span>
          </div>
          <span className="readiness-message">{formReadiness.summaryMessage}</span>
        </div>
        <div className="readiness-principle">
          AI suggests &middot; Human confirms &middot; System validates
        </div>
      </div>

      {/* Human-in-the-Loop Review Banner */}
      {reviewSummary && (
        <div className="human-review-banner" role="region" aria-label="AI extraction review summary">
          <div className="review-banner-header">
            <div className="review-banner-title">
              <span className="review-banner-icon" aria-hidden="true">✨</span>
              <strong>AI Extraction Review:</strong>
              <span>
                {reviewSummary.applied.length > 0
                  ? `AI suggested ${reviewSummary.applied.length} piece${reviewSummary.applied.length === 1 ? '' : 's'} of information.`
                  : 'No new compatible fields were applied.'}
              </span>
            </div>
            <div className="review-banner-actions">
              {formReadiness.unreviewedAiFields.length > 0 && (
                <button
                  type="button"
                  className="review-btn confirm-all-btn"
                  onClick={() => {
                    confirmAllAiSuggestions();
                    setSubmissionBlockedMessage(null);
                  }}
                  title="Confirm all remaining AI suggestions as accurate"
                >
                  ✓ Confirm all suggestions
                </button>
              )}
              {activeAiMarkerCount > 0 && (
                <button
                  type="button"
                  className="review-btn review-ai-fields-btn"
                  onClick={handleReviewAiFields}
                  title="Jump to the first field populated by AI"
                >
                  🔍 Review AI fields
                </button>
              )}
              {activeAiMarkerCount > 0 && (
                <button
                  type="button"
                  className="review-btn clear-markers-btn"
                  onClick={handleClearMarkers}
                  title="Clear AI suggestion markers without erasing form values"
                >
                  Clear AI markers
                </button>
              )}
              <button
                type="button"
                className="review-btn reset-form-btn"
                onClick={handleResetEntireForm}
              >
                Reset form
              </button>
            </div>
          </div>

          <div className="review-banner-body">
            {reviewSummary.applied.length > 0 && (
              <p className="review-instruction">
                Please review the highlighted fields below. Editing any field will automatically confirm your manual value and remove the AI suggestion marker.
              </p>
            )}

            {/* List applied suggestions */}
            {reviewSummary.applied.length > 0 && (
              <div className="review-chip-list">
                {reviewSummary.applied.map((item) => (
                  <span key={item.fieldName} className="review-chip applied">
                    {item.fieldLabel}: <strong>{String(item.value)}</strong>
                  </span>
                ))}
              </div>
            )}

            {/* Notice for active validation errors */}
            {formReadiness.activeErrors.length > 0 && (
              <div className="review-errors-notice" role="alert">
                <span className="errors-icon">⚠️</span>
                <div>
                  <strong>
                    {formReadiness.activeErrors.length} field{formReadiness.activeErrors.length === 1 ? '' : 's'} require{formReadiness.activeErrors.length === 1 ? 's' : ''} your review:
                  </strong>
                  <ul className="invalid-details-list" style={{ marginTop: '0.25rem' }}>
                    {formReadiness.activeErrors.map((err) => (
                      <li key={err.fieldName}>
                        <strong>{err.fieldName}:</strong> {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Notice for missing required fields */}
            {missingRequiredFields.length > 0 && (
              <div className="review-missing-notice" role="status">
                <span className="missing-icon">&#9432;</span>
                <div>
                  <strong>
                    {missingRequiredFields.length} required field{missingRequiredFields.length === 1 ? '' : 's'} still need{missingRequiredFields.length === 1 ? 's' : ''} your attention:
                  </strong>{' '}
                  <span style={{ color: '#b45309', fontWeight: 600 }}>
                    {missingRequiredFields.map((f) => f.label).join(', ')}
                  </span>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#92400e' }}>
                    Missing information is normal in unstructured text. Please complete these fields before submitting.
                  </p>
                </div>
              </div>
            )}

            {/* List preserved user manual edits */}
            {reviewSummary.preserved.length > 0 && (
              <div className="review-preserved-notice">
                <span className="preserved-icon">&#128274;</span>
                <span>
                  <strong>{reviewSummary.preserved.length} field{reviewSummary.preserved.length === 1 ? '' : 's'} preserved:</strong> Your manual edits were kept over incoming suggestions ({reviewSummary.preserved.map((p) => p.fieldLabel).join(', ')}).
                </span>
              </div>
            )}

            {/* List rejected/incompatible fields if any */}
            {reviewSummary.invalid.length > 0 && (
              <div className="review-invalid-notice">
                <span className="invalid-icon">&#9888;</span>
                <div>
                  <strong>{reviewSummary.invalid.length} value{reviewSummary.invalid.length === 1 ? '' : 's'} could not be safely matched to the form:</strong>
                  <ul className="invalid-details-list">
                    {reviewSummary.invalid.map((item) => (
                      <li key={item.fieldName}>
                        {item.fieldLabel}: {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submission Guard Alert */}
      {submissionBlockedMessage && (
        <div className="submission-guard-alert" role="alert">
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">🚫</span>
          <div>
            <strong>Cannot Submit Form</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{submissionBlockedMessage}</p>
          </div>
        </div>
      )}

      {/* Submission Error Alert */}
      {submissionError && (
        <div className="submission-guard-alert submission-error-alert" role="alert">
          <span style={{ fontSize: '1.25rem' }} aria-hidden="true">⚠️</span>
          <div>
            <strong>Submission Failed</strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>{submissionError}</p>
          </div>
        </div>
      )}

      {/* Dynamic Form Master Coordinator */}
      <DynamicForm
        schema={schema}
        form={form}
        onSubmit={handleFormSubmit}
        onSaveDraft={handleSaveDraft}
        isSavingDraft={isSavingDraft}
        reviewSummaryNode={reviewSummaryNode}
      />

      {/* Submission Success & Verified Contract Preview Card */}
      {submissionStatus === 'success' && finalSubmissionPayload && (
        <div
          className="submission-preview-card"
          role="status"
          aria-live="polite"
          style={{
            marginTop: '1.5rem',
            padding: '1.25rem',
            backgroundColor: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem', color: '#16a34a' }}>✓</span>
            <h3 style={{ color: '#166534', fontSize: '1.1rem', margin: 0 }}>
              Claim Form Successfully Submitted
            </h3>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#15803d', margin: '0 0 0.75rem 0' }}>
            Submission contract verified. Clean payload captured and ready for persistence:
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#166534' }}>
            <span><strong>Schema ID:</strong> {finalSubmissionPayload.schemaId}</span>
            <span><strong>Version:</strong> {finalSubmissionPayload.schemaVersion}</span>
            <span><strong>Submitted At:</strong> {finalSubmissionPayload.submittedAt}</span>
            <span><strong>Active Fields Count:</strong> {Object.keys(finalSubmissionPayload.values).length}</span>
          </div>
          <pre
            style={{
              background: '#ffffff',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid #dcfce7',
              fontSize: '0.8rem',
              overflowX: 'auto',
              maxHeight: '260px',
            }}
          >
            {JSON.stringify(finalSubmissionPayload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ClaimFormPage;
