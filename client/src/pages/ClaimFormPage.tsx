import React, { useState, useMemo, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { useFormSchema } from '../hooks/useFormSchema';
import { Loading } from '../components/common/Loading';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ClockIcon,
  CheckIcon,
  EditIcon,
  SendIcon,
  FileTextIcon,
  FolderIcon,
} from '../components/common/Icons';
import { FormSection } from '../components/dynamic-form/FormSection';
import { FieldRenderer } from '../components/dynamic-form/FieldRenderer';
import {
  mapExtractionToFormFields,
  getAllSchemaFields,
  ExtractionMappingSummary,
} from '../utils/aiFormMapping';
import { filterActiveVisibleFields, getNestedValue } from '../utils/conditionalLogic';
import { computeFormReadiness, cleanSubmissionPayload } from '../utils/validation';
import { useAiSuggestionStore } from '../stores/aiSuggestionStore';
import { ClaimExtractionResult } from '../types/ai';
import { FormValues, FormSubmissionPayload, SubmissionStatus, FormSchema, FormField } from '../types/form';
import { submitClaimForm } from '../services/submissionApi';
import { draftApi, checkDraftCompatibility } from '../services/draftApi';
import { aiApi } from '../services/aiApi';

export interface ClaimFormPageProps {
  initialDraftId?: string | null;
  initialSchema?: FormSchema;
  onNavigateHome?: () => void;
  onViewAllClaims?: () => void;
  onViewClaimDetails?: (claimId: string) => void;
}

export type StepperStage = 'describe' | 'analyzing' | 'extracted' | 'form' | 'review' | 'success';

const SAMPLE_NARRATIVES = [
  'I was driving my Honda Civic yesterday when I collided with a deer. The front windshield was damaged.',
  'A truck rear-ended my 2021 Ford F-150 at a red light on Highway 101, damaging the tailgate and bumper.',
  'Severe hail storm yesterday dented the entire roof and hood of my Toyota Camry while parked outside.',
];

export const ClaimFormPage: React.FC<ClaimFormPageProps> = ({
  initialDraftId = null,
  initialSchema,
  onNavigateHome,
  onViewAllClaims,
}) => {
  const schemaHookResult = useFormSchema('auto-insurance-claim');
  const schema = initialSchema || schemaHookResult.schema;
  const loading = initialSchema ? false : schemaHookResult.loading;
  const error = initialSchema ? null : schemaHookResult.error;
  const refetch = schemaHookResult.refetch;

  const [currentStage, setCurrentStage] = useState<StepperStage>('describe');
  const [incidentText, setIncidentText] = useState<string>('');
  const [rawExtractionResult, setRawExtractionResult] = useState<ClaimExtractionResult | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Review & Submission state
  const [reviewSummary, setReviewSummary] = useState<ExtractionMappingSummary | null>(null);
  const [submissionBlockedMessage, setSubmissionBlockedMessage] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('idle');
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [confirmedSubmissionId, setConfirmedSubmissionId] = useState<string | null>(null);
  const [finalSubmissionPayload, setFinalSubmissionPayload] = useState<FormSubmissionPayload | null>(null);

  // Draft Management State
  const [activeDraftId, setActiveDraftId] = useState<string | null>(initialDraftId);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);

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
    shouldUnregister: false,
  });

  const [reviewValues, setReviewValues] = useState<FormValues>({});

  const allSchemaFields = useMemo(
    () => (schema ? getAllSchemaFields(schema) : []),
    [schema]
  );

  const currentValues = form.watch();

  const valuesSnapshot = useMemo(() => {
    if (currentStage === 'review' && Object.keys(reviewValues).length > 0) {
      return reviewValues;
    }
    return currentValues;
  }, [currentStage, reviewValues, currentValues]);

  const activeFields = useMemo(() => {
    if (!schema) return [];
    return filterActiveVisibleFields(allSchemaFields, valuesSnapshot);
  }, [schema, allSchemaFields, valuesSnapshot]);

  const readiness = useMemo(() => {
    const unreviewedAi = Object.keys(aiSuggestedFields).filter(
      (f) => !userReviewedFields[f] && !userModifiedFields[f]
    );
    const formErrors = form.formState.errors;
    return computeFormReadiness(activeFields, valuesSnapshot, formErrors, unreviewedAi);
  }, [activeFields, valuesSnapshot, form.formState.errors, aiSuggestedFields, userReviewedFields, userModifiedFields]);

  // Load draft if initialDraftId provided
  useEffect(() => {
    if (!initialDraftId || !schema) return;

    const loadDraft = async () => {
      const res = await draftApi.getDraft(initialDraftId);
      if (res.success && res.draft) {
        const draft = res.draft;
        const compat = checkDraftCompatibility(draft, schema.schemaId || schema.id || '', schema.version || 1);
        if (compat.compatible) {
          form.reset(draft.values);
          setActiveDraftId(draft.draftId);
          setCurrentStage('form');
        }
      }
    };
    void loadDraft();
  }, [initialDraftId, schema, form]);

  // Handle AI analysis
  const handleAnalyzeWithAi = async () => {
    if (!incidentText.trim()) return;

    setCurrentStage('analyzing');
    setExtractionError(null);

    try {
      const result = await aiApi.extractClaim(incidentText, schema?.schemaId || 'auto-insurance-claim');
      setRawExtractionResult(result);

      if (schema) {
        const mapping = mapExtractionToFormFields(schema, result, {
          userModifiedFields,
          currentValues: form.getValues(),
        });
        setReviewSummary(mapping);
      }

      setCurrentStage('extracted');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI analysis failed.';
      setExtractionError(msg);
      setCurrentStage('describe');
    }
  };

  // Continue from AI review card into dynamic form
  const handleContinueToForm = () => {
    const descField: string = 'incident.description';
    if (!schema || !reviewSummary) {
      if (incidentText.trim() && !form.getValues(descField)) {
        form.setValue(descField, incidentText.trim(), { shouldValidate: true });
      }
      setCurrentStage('form');
      return;
    }

    const newAiValues: Record<string, unknown> = {};
    for (const applied of reviewSummary.applied) {
      form.setValue(applied.fieldName, applied.value, {
        shouldValidate: true,
        shouldDirty: false,
      });
      newAiValues[applied.fieldName] = applied.value;
    }

    // Preserve original narrative in incident.description if not extracted
    if (incidentText.trim() && !form.getValues(descField)) {
      form.setValue(descField, incidentText.trim(), { shouldValidate: true });
    }

    setAiSuggestions(newAiValues);
    setCurrentStage('form');
  };

  // Continue to form manually without AI extraction
  const handleContinueManually = () => {
    const descField: string = 'incident.description';
    if (incidentText.trim() && !form.getValues(descField)) {
      form.setValue(descField, incidentText.trim(), { shouldValidate: true });
    }
    setCurrentStage('form');
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!schema) return;
    setIsSavingDraft(true);
    setDraftNotice(null);

    try {
      const values = form.getValues();
      const res = await draftApi.saveDraft({
        draftId: activeDraftId || undefined,
        schemaId: schema.schemaId || schema.id || 'auto-insurance-claim',
        schemaVersion: schema.version || 1,
        values,
      });

      if (res.success && res.draft) {
        setActiveDraftId(res.draft.draftId);
        setDraftNotice(`Draft saved at ${new Date().toLocaleTimeString()}`);
        setTimeout(() => setDraftNotice(null), 4000);
      }
    } catch {
      setDraftNotice('Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Move from Form to Review
  const handleProceedToReview = async () => {
    const isValid = await form.trigger();
    if (!isValid) {
      setSubmissionBlockedMessage('Please resolve highlighted form validation errors before proceeding.');
      return;
    }
    setSubmissionBlockedMessage(null);
    const latestValues = form.getValues();
    setReviewValues(latestValues);
    setCurrentStage('review');
  };

  // Submit Claim
  const handleSubmitFinal = async () => {
    if (!schema) return;
    setSubmissionStatus('submitting');
    setSubmissionError(null);

    try {
      const rawValues = Object.keys(reviewValues).length > 0 ? reviewValues : form.getValues();
      const cleanedValues = cleanSubmissionPayload(rawValues, activeFields);

      const payload: FormSubmissionPayload = {
        schemaId: schema.schemaId || schema.id || 'auto-insurance-claim',
        schemaVersion: schema.version || 1,
        values: cleanedValues,
        submittedAt: new Date().toISOString(),
        draftId: activeDraftId || undefined,
      };

      const result = await submitClaimForm(payload);

      if (result.success) {
        setFinalSubmissionPayload(payload);
        const subId = result.submissionId || 'CLM-SUBMITTED';
        setConfirmedSubmissionId(subId);
        setSubmissionStatus('success');
        setCurrentStage('success');

        // Delete active draft if this was from a draft
        if (activeDraftId) {
          void draftApi.deleteDraft(activeDraftId);
        }
      } else {
        setSubmissionStatus('error');
        setSubmissionError(result.error || 'Submission failed.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred during submission.';
      setSubmissionStatus('error');
      setSubmissionError(msg);
    }
  };

  // Reset for new claim
  const handleStartAnother = () => {
    form.reset({});
    setReviewValues({});
    resetAiStore();
    clearAiMarkers();
    setIncidentText('');
    setRawExtractionResult(null);
    setReviewSummary(null);
    setActiveDraftId(null);
    setSubmissionStatus('idle');
    setConfirmedSubmissionId(null);
    setFinalSubmissionPayload(null);
    setCurrentStage('describe');
  };

  if (loading) {
    return <Loading message="Loading claim form schema..." fullPage />;
  }

  if (error || !schema) {
    return (
      <div className="forma-page-container">
        <ErrorMessage
          title="Schema Loading Error"
          message={error || 'Unable to load form schema from server.'}
          onRetry={refetch}
        />
      </div>
    );
  }

  // Stepper UI helper
  const getStepClass = (step: number) => {
    let currentStepNum = 1;
    if (currentStage === 'describe') currentStepNum = 1;
    else if (currentStage === 'analyzing' || currentStage === 'extracted') currentStepNum = 2;
    else if (currentStage === 'form') currentStepNum = 3;
    else if (currentStage === 'review' || currentStage === 'success') currentStepNum = 4;

    if (currentStepNum > step) return 'forma-step-completed';
    if (currentStepNum === step) return 'forma-step-active';
    return 'forma-step-pending';
  };

  const hasSections = Array.isArray(schema.sections) && schema.sections.length > 0;
  const hasFields = Array.isArray(schema.fields) && schema.fields.length > 0;

  const renderReviewFieldValue = (field: FormField) => {
    const val = getNestedValue(valuesSnapshot, field.name);
    const isAi = field.name in aiSuggestedFields;

    let displayValue: React.ReactNode = null;
    if (val !== undefined && val !== null && val !== '') {
      if (field.type === 'select' && field.options) {
        const matching = field.options.find((opt) => String(opt.value) === String(val));
        displayValue = matching ? matching.label : String(val);
      } else if (field.type === 'checkbox') {
        displayValue = val === true || val === 'true' ? 'Yes' : 'No';
      } else if (Array.isArray(val)) {
        displayValue = val.join(', ');
      } else {
        displayValue = String(val);
      }
    }

    return (
      <div key={field.id} className="forma-review-field">
        <div className="forma-review-label-wrap">
          <span className="forma-review-label">{field.label}</span>
          {isAi && <Badge variant="ai" size="sm">AI suggested</Badge>}
        </div>
        <span className="forma-review-value">
          {displayValue !== null ? (
            displayValue
          ) : (
            <span className="forma-text-muted">Not specified</span>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="forma-page-container forma-claim-flow">
      {/* Header & Stepper */}
      <div className="forma-flow-header">
        <div>
          <span className="forma-flow-eyebrow">Insurance Claim Intake</span>
          <h1 className="forma-flow-title">New Insurance Claim</h1>
          <p className="forma-flow-desc">
            Describe what happened in your own words. Forma AI will extract relevant information and guide you through the required questions.
          </p>
        </div>

        {/* Stepper (01 Describe Incident -> 02 AI Analysis -> 03 Review -> 04 Submit) */}
        <div className="forma-stepper" role="navigation" aria-label="Claim Progress">
          <div className={`forma-step-item ${getStepClass(1)}`}>
            <span className="forma-step-num">01</span>
            <span className="forma-step-label">Describe Incident</span>
          </div>
          <div className="forma-step-divider" />
          <div className={`forma-step-item ${getStepClass(2)}`}>
            <span className="forma-step-num">02</span>
            <span className="forma-step-label">AI Analysis</span>
          </div>
          <div className="forma-step-divider" />
          <div className={`forma-step-item ${getStepClass(3)}`}>
            <span className="forma-step-num">03</span>
            <span className="forma-step-label">Review</span>
          </div>
          <div className="forma-step-divider" />
          <div className={`forma-step-item ${getStepClass(4)}`}>
            <span className="forma-step-num">04</span>
            <span className="forma-step-label">Submit</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          PAGE 3: STAGE 1 — DESCRIBE INCIDENT
      ========================================================================= */}
      {currentStage === 'describe' && (
        <Card
          title={
            <div className="forma-card-title-row">
              <SparklesIcon size={18} color="#0ea5e9" />
              <span>Describe the incident</span>
            </div>
          }
          subtitle="Describe what happened in your own words. Forma AI will identify relevant information and guide you through the required questions."
        >
          <div className="forma-describe-box">
            <textarea
              className="forma-textarea forma-textarea-lg"
              rows={5}
              value={incidentText}
              onChange={(e) => setIncidentText(e.target.value)}
              placeholder="I was driving my Honda Civic yesterday when I hit a deer. The front windshield was damaged."
              aria-label="Incident description"
            />

            <p className="forma-field-helper">
              Describe what happened in your own words. Forma AI will identify relevant information and guide you through the required questions.
            </p>

            {extractionError && (
              <div className="forma-extraction-failed-box forma-mt-md" role="alert">
                <div className="forma-failed-header">
                  <div className="forma-failed-icon">
                    <AlertCircleIcon size={20} color="#f59e0b" />
                  </div>
                  <div className="forma-failed-title-group">
                    <h3 className="forma-failed-heading">AI analysis couldn&rsquo;t be completed.</h3>
                    <p className="forma-failed-desc">
                      AI extraction requires the configured OPENAI_API_KEY. Your information is safe. You can continue by entering the claim details manually.
                    </p>
                  </div>
                </div>

                <div className="forma-failed-detail-row">
                  <span className="forma-failed-label">Server response:</span>
                  <span className="forma-failed-code">{extractionError}</span>
                </div>

                <div className="forma-failed-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<ArrowRightIcon size={14} />}
                    onClick={handleContinueManually}
                  >
                    Continue Manually with Claim Form
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<SparklesIcon size={14} />}
                    onClick={handleAnalyzeWithAi}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}

            {/* Prompt test chips */}
            <div className="forma-chips-row">
              <span className="forma-chips-label">Sample narratives:</span>
              <div className="forma-chips-list">
                {SAMPLE_NARRATIVES.map((narrative, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="forma-chip-btn"
                    onClick={() => setIncidentText(narrative)}
                  >
                    &ldquo;{narrative.slice(0, 48)}...&rdquo;
                  </button>
                ))}
              </div>
            </div>

            <div className="forma-actions-bar forma-mt-md">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setCurrentStage('form')}
              >
                Skip to Blank Form
              </Button>
              <Button
                variant="primary"
                size="md"
                icon={<SparklesIcon size={16} />}
                disabled={!incidentText.trim()}
                onClick={handleAnalyzeWithAi}
              >
                Analyze with AI
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* =========================================================================
          PAGE 4: STAGE 2 — AI ANALYSIS IN PROGRESS
      ========================================================================= */}
      {currentStage === 'analyzing' && (
        <Card className="forma-analyzing-card">
          <div className="forma-analyzing-wrap">
            <div className="forma-analyzing-spinner" aria-hidden="true" />
            <h2 className="forma-analyzing-title">Analyzing your incident</h2>
            <p className="forma-analyzing-desc">
              Forma AI is processing your narrative, matching facts against the form schema, and preparing structured values...
            </p>
            <div className="forma-analyzing-progress">
              <div className="forma-progress-bar-indeterminate" />
            </div>
          </div>
        </Card>
      )}

      {/* =========================================================================
          PAGE 4: STAGE 2 — AI EXTRACTED INFORMATION REVIEW CARD
      ========================================================================= */}
      {currentStage === 'extracted' && rawExtractionResult && (
        <Card
          title={
            <div className="forma-card-title-row">
              <Badge variant="ai" icon={<SparklesIcon size={13} />}>
                AI Extracted Information
              </Badge>
              <span>Review Extracted Entities</span>
            </div>
          }
          subtitle="Forma AI extracted the following structured data from your description. Review before continuing to the form."
        >
          <div className="forma-extraction-grid">
            {Object.entries(rawExtractionResult).map(([key, val]) => {
              if (val === undefined || val === null || val === '') return null;
              // Clean key label
              const cleanLabel = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, (str) => str.toUpperCase());
              return (
                <div key={key} className="forma-extraction-item">
                  <span className="forma-extraction-key">{cleanLabel}</span>
                  <span className="forma-extraction-val">{String(val)}</span>
                </div>
              );
            })}
          </div>

          <div className="forma-notice-box forma-mt-md">
            <span className="forma-notice-icon">
              <SparklesIcon size={16} color="#0ea5e9" />
            </span>
            <div className="forma-notice-text">
              <strong>Human-in-the-Loop Assurance:</strong> All extracted values will be pre-filled into the form as editable suggestions. You will have full authority to edit, verify, or override any field.
            </div>
          </div>

          <div className="forma-actions-bar forma-mt-md">
            <Button
              variant="outline"
              size="md"
              icon={<ArrowLeftIcon size={16} />}
              onClick={() => setCurrentStage('describe')}
            >
              Edit Description
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<ArrowRightIcon size={16} />}
              onClick={handleContinueToForm}
            >
              Continue to Claim Form
            </Button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          PAGE 5: STAGE 3 — DYNAMIC CLAIM FORM
      ========================================================================= */}
      {currentStage === 'form' && (
        <div className="forma-form-layout">
          {/* Main Column: Dynamic Form Driven by MongoDB Schema */}
          <div className="forma-form-main">
            <Card
              title={
                <div className="forma-card-title-row">
                  <FileTextIcon size={18} color="#0ea5e9" />
                  <span>{schema.title}</span>
                  {activeDraftId && (
                    <Badge variant="neutral" size="sm" className="forma-draft-status-pill">
                      <ClockIcon size={11} />
                      <span>Draft #{activeDraftId.slice(-6)}</span>
                    </Badge>
                  )}
                </div>
              }
              subtitle={schema.description}
            >
              <FormProvider {...form}>
                <form onSubmit={(e) => { e.preventDefault(); void handleProceedToReview(); }} noValidate>
                  <div className="forma-dynamic-content">
                    {hasSections ? (
                      schema.sections!.map((section) => (
                        <FormSection key={section.id} section={section}>
                          {section.fields?.map((field) => (
                            <FieldRenderer key={field.id} field={field} />
                          ))}
                        </FormSection>
                      ))
                    ) : hasFields ? (
                      <div className="forma-flat-fields">
                        {schema.fields!.map((field) => (
                          <FieldRenderer key={field.id} field={field} />
                        ))}
                      </div>
                    ) : (
                      <p className="forma-empty-notice">No fields in schema.</p>
                    )}
                  </div>

                  {submissionBlockedMessage && (
                    <ErrorMessage message={submissionBlockedMessage} className="forma-mt-md" />
                  )}

                  {draftNotice && (
                    <div className="forma-success-toast forma-mt-sm">
                      <CheckCircleIcon size={16} color="#10b981" />
                      <span>{draftNotice}</span>
                    </div>
                  )}

                  <div className="forma-actions-bar forma-mt-lg">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      icon={<ArrowLeftIcon size={16} />}
                      onClick={() => setCurrentStage('describe')}
                    >
                      Back to Narrative
                    </Button>
                    <div className="forma-actions-group">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        icon={<ClockIcon size={16} />}
                        isLoading={isSavingDraft}
                        onClick={handleSaveDraft}
                      >
                        Save Draft
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        icon={<ArrowRightIcon size={16} />}
                      >
                        Proceed to Review
                      </Button>
                    </div>
                  </div>
                </form>
              </FormProvider>
            </Card>
          </div>

          {/* Secondary Column: AI Assistance & Progress Panel */}
          <aside className="forma-form-sidebar">
            {/* AI Assistance Status */}
            <Card
              title={
                <div className="forma-card-title-row">
                  <SparklesIcon size={16} color="#38bdf8" />
                  <span>AI Intake Assistance</span>
                </div>
              }
              className="forma-sidebar-card"
            >
              <div className="forma-ai-stats">
                <div className="forma-ai-stat-row">
                  <span className="forma-stat-label">AI Suggested</span>
                  <Badge variant="ai" size="sm">
                    {Object.keys(aiSuggestedFields).length} fields
                  </Badge>
                </div>
                <div className="forma-ai-stat-row">
                  <span className="forma-stat-label">Reviewed by You</span>
                  <Badge variant="neutral" size="sm">
                    {Object.keys(userReviewedFields).length + Object.keys(userModifiedFields).length} fields
                  </Badge>
                </div>
              </div>

              {Object.keys(aiSuggestedFields).length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="forma-w-full forma-mt-sm"
                  icon={<CheckIcon size={14} />}
                  onClick={confirmAllAiSuggestions}
                >
                  Confirm All AI Fields
                </Button>
              )}
            </Card>

            {/* Form Readiness Status */}
            <Card
              title={
                <div className="forma-card-title-row">
                  <CheckCircleIcon
                    size={16}
                    color={readiness.status === 'READY' ? '#10b981' : '#f59e0b'}
                  />
                  <span>Form Readiness</span>
                </div>
              }
              className="forma-sidebar-card"
            >
              <div className="forma-readiness-badge-row">
                <Badge
                  variant={
                    readiness.status === 'READY'
                      ? 'success'
                      : readiness.status === 'NEEDS REVIEW'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {readiness.status}
                </Badge>
              </div>

              <p className="forma-readiness-summary">{readiness.summaryMessage}</p>

              {readiness.missingRequired.length > 0 && (
                <div className="forma-missing-fields-box">
                  <span className="forma-missing-title">Missing Required:</span>
                  <ul className="forma-missing-list">
                    {readiness.missingRequired.map((f) => (
                      <li key={f.id}>{f.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}

      {/* =========================================================================
          PAGE 6: STAGE 4 — REVIEW & SUBMIT
      ========================================================================= */}
      {currentStage === 'review' && (
        <Card
          title={
            <div className="forma-card-title-row">
              <FileTextIcon size={18} color="#0ea5e9" />
              <span>Review your claim</span>
            </div>
          }
          subtitle="Every value shown below comes directly from your active form entries. Verify before final submission."
        >
          <div className="forma-review-sections">
            {hasSections ? (
              <>
                {schema.sections!.map((section) => {
                  const sectionActiveFields = activeFields.filter((f) =>
                    section.fields?.some((sf) => sf.id === f.id)
                  );
                  if (sectionActiveFields.length === 0) return null;

                  // Normalize group title for clean logical grouping
                  let groupHeading = section.title;
                  if (section.title.toLowerCase().includes('incident')) groupHeading = 'Incident';
                  else if (section.title.toLowerCase().includes('vehicle')) groupHeading = 'Vehicle';
                  else if (section.title.toLowerCase().includes('damage')) groupHeading = 'Damage';

                  return (
                    <div key={section.id} className="forma-review-group">
                      <h3 className="forma-review-group-title">{groupHeading}</h3>
                      <div className="forma-review-grid">
                        {sectionActiveFields.map(renderReviewFieldValue)}
                      </div>
                    </div>
                  );
                })}

                {/* Additional Details group for any active fields not belonging to the primary sections */}
                {(() => {
                  const sectionFieldIds = new Set(
                    schema.sections?.flatMap((s) => s.fields?.map((f) => f.id) || []) || []
                  );
                  const unassignedFields = activeFields.filter((f) => !sectionFieldIds.has(f.id));
                  if (unassignedFields.length === 0) return null;

                  return (
                    <div className="forma-review-group">
                      <h3 className="forma-review-group-title">Additional Details</h3>
                      <div className="forma-review-grid">
                        {unassignedFields.map(renderReviewFieldValue)}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div className="forma-review-grid">
                {activeFields.map(renderReviewFieldValue)}
              </div>
            )}
          </div>

          {submissionError && (
            <ErrorMessage message={submissionError} className="forma-mt-md" />
          )}

          <div className="forma-actions-bar forma-mt-lg">
            <Button
              variant="outline"
              size="md"
              icon={<EditIcon size={16} />}
              onClick={() => {
                form.reset(reviewValues);
                setCurrentStage('form');
              }}
            >
              Edit
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={<SendIcon size={16} />}
              isLoading={submissionStatus === 'submitting'}
              onClick={handleSubmitFinal}
            >
              Submit Claim
            </Button>
          </div>
        </Card>
      )}

      {/* =========================================================================
          PAGE 7: STAGE 5 — SUBMISSION SUCCESS
      ========================================================================= */}
      {currentStage === 'success' && (
        <Card className="forma-success-card">
          <div className="forma-success-wrap">
            <div className="forma-success-icon-ring">
              <CheckCircleIcon size={36} color="#10b981" />
            </div>
            <h2 className="forma-success-title">Claim submitted</h2>
            <p className="forma-success-desc">
              Your insurance claim intake has been successfully validated and recorded by the Forma AI engine.
            </p>

            <div className="forma-success-details-card">
              <div className="forma-success-detail-row">
                <span className="forma-detail-label">Claim Identifier</span>
                <code className="forma-code-pill forma-text-bold">
                  {confirmedSubmissionId || 'CLM-CONFIRMED'}
                </code>
              </div>
              <div className="forma-success-detail-row">
                <span className="forma-detail-label">Schema Applied</span>
                <span>{schema.title} (v{schema.version})</span>
              </div>
              <div className="forma-success-detail-row">
                <span className="forma-detail-label">Submitted At</span>
                <span>{new Date().toLocaleString()}</span>
              </div>
              <div className="forma-success-detail-row">
                <span className="forma-detail-label">Fields Captured</span>
                <span>{finalSubmissionPayload ? Object.keys(finalSubmissionPayload.values).length : 0} fields verified</span>
              </div>
            </div>

            <div className="forma-success-actions">
              <Button
                variant="primary"
                size="md"
                icon={<FolderIcon size={16} />}
                onClick={onViewAllClaims || onNavigateHome}
              >
                View My Claims
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={<SparklesIcon size={16} />}
                onClick={handleStartAnother}
              >
                Start Another Claim
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClaimFormPage;
