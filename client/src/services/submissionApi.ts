import { apiClient } from './api';
import { FormSubmissionPayload, SubmissionResult, ApiResponse } from '../types/form';

export interface SubmittedClaimRecord {
  submissionId: string;
  schemaId: string;
  schemaVersion: number;
  values: Record<string, unknown>;
  submittedAt: string;
  status: 'Submitted' | 'Under Review' | 'Approved' | 'draft' | 'submitted';
}

const STORAGE_SUBMISSIONS_KEY = 'forma_ai_submitted_claims';

// In-memory fallback
let inMemorySubmissions: SubmittedClaimRecord[] = [];

const getStoredSubmissions = (): SubmittedClaimRecord[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_SUBMISSIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    }
  } catch {
    // Fall back to in-memory
  }
  return inMemorySubmissions;
};

const saveStoredSubmissions = (records: SubmittedClaimRecord[]): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_SUBMISSIONS_KEY, JSON.stringify(records));
      return;
    }
  } catch {
    // Fall back
  }
  inMemorySubmissions = records;
};

interface BackendSubmissionDoc {
  _id?: string;
  formId?: string;
  formVersion?: number;
  data?: Record<string, unknown>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

function mapBackendDocToRecord(doc: BackendSubmissionDoc): SubmittedClaimRecord {
  const subId = String(doc._id || '');
  const rawStatus = String(doc.status || 'submitted');
  const statusDisplay =
    rawStatus.toLowerCase() === 'draft' ? 'draft' : 'Submitted';

  return {
    submissionId: subId,
    schemaId: String(doc.formId || 'auto-insurance-claim'),
    schemaVersion: Number(doc.formVersion || 1),
    values: (doc.data || {}) as Record<string, unknown>,
    submittedAt: String(doc.updatedAt || doc.createdAt || new Date().toISOString()),
    status: statusDisplay as 'Submitted' | 'draft',
  };
}

/**
 * Forma AI — Backend-Integrated Submission Service
 *
 * Implements the full claim submission lifecycle:
 * 1. Creates a submission record via POST /api/submissions
 * 2. Finalizes the submission with schema validation via POST /api/submissions/:id/submit
 * 3. Persists the submission to MongoDB
 */
export const submitClaimForm = async (
  payload: FormSubmissionPayload
): Promise<SubmissionResult> => {
  const formId = payload.formId || payload.schemaId;
  const formVersion = payload.formVersion || payload.schemaVersion;
  const values = payload.data || payload.values;

  if (!formId) {
    return {
      success: false,
      error: 'Submission contract violation: schemaId is missing.',
    };
  }

  if (typeof formVersion !== 'number') {
    return {
      success: false,
      error: 'Submission contract violation: schemaVersion must be a number.',
    };
  }

  if (!values || typeof values !== 'object') {
    return {
      success: false,
      error: 'Submission contract violation: values payload is missing or invalid.',
    };
  }

  try {
    const existingDraftId = payload.submissionId || payload.draftId;
    let mongoId = '';
    let initialDoc: BackendSubmissionDoc | undefined;

    if (existingDraftId && /^[0-9a-fA-F]{24}$/.test(existingDraftId)) {
      // 1. Incrementally update existing draft on backend (PATCH /api/submissions/:id)
      const patchResponse = await apiClient.patch<ApiResponse<BackendSubmissionDoc>>(
        `/submissions/${existingDraftId}`,
        { data: values }
      );
      initialDoc = patchResponse.data?.data;
      mongoId = existingDraftId;
    } else {
      // 1. Initiate submission draft on backend (POST /api/submissions)
      const createResponse = await apiClient.post<ApiResponse<BackendSubmissionDoc>>(
        '/submissions',
        {
          formId,
          formVersion,
          data: values,
          status: 'draft',
        }
      );
      initialDoc = createResponse.data?.data;
      mongoId = initialDoc?._id || '';
    }

    if (!mongoId) {
      throw new Error('Failed to retrieve submission identifier from backend.');
    }

    // 2. Finalize submission via backend schema validation (POST /api/submissions/:id/submit)
    const finalizeResponse = await apiClient.post<ApiResponse<BackendSubmissionDoc>>(
      `/submissions/${mongoId}/submit`
    );

    const finalizedDoc = finalizeResponse.data?.data || initialDoc;
    const finalId = String(finalizedDoc?._id || mongoId);
    const finalTimestamp = finalizedDoc?.updatedAt
      ? new Date(finalizedDoc.updatedAt).toISOString()
      : payload.submittedAt || new Date().toISOString();

    const record: SubmittedClaimRecord = {
      submissionId: finalId,
      schemaId: formId,
      schemaVersion: formVersion,
      values: (finalizedDoc?.data || values) as Record<string, unknown>,
      submittedAt: finalTimestamp,
      status: 'Submitted',
    };

    // Cache locally for immediate UI availability & offline resilience
    const current = getStoredSubmissions();
    const updated = [record, ...current.filter((r) => r.submissionId !== finalId)];
    saveStoredSubmissions(updated);

    return {
      success: true,
      message: 'Claim submitted and verified by backend.',
      submissionId: finalId,
      payload: {
        schemaId: formId,
        schemaVersion: formVersion,
        values: (finalizedDoc?.data || values) as Record<string, unknown>,
        submittedAt: finalTimestamp,
      },
    };
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : 'An error occurred during claim submission.';
    return {
      success: false,
      error: errorMsg,
    };
  }
};

/**
 * Lists all claims from backend MongoDB API (GET /api/submissions),
 * falling back to local storage if network is temporarily unavailable.
 */
export const listSubmittedClaims = async (): Promise<SubmittedClaimRecord[]> => {
  try {
    const response = await apiClient.get<ApiResponse<BackendSubmissionDoc[]>>('/submissions');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      const records = response.data.data
        .filter((doc) => doc.status !== 'draft')
        .map(mapBackendDocToRecord);

      // Refresh local cache with real backend records
      saveStoredSubmissions(records);
      return records;
    }
  } catch {
    // If backend is temporarily unreachable, fall back to cached records
  }
  return getStoredSubmissions();
};

/**
 * Retrieves a single submitted claim by ID from backend MongoDB API (GET /api/submissions/:id),
 * falling back to local cache if unavailable.
 */
export const getSubmittedClaim = async (
  submissionId: string
): Promise<SubmittedClaimRecord | null> => {
  try {
    const response = await apiClient.get<ApiResponse<BackendSubmissionDoc>>(
      `/submissions/${encodeURIComponent(submissionId)}`
    );
    if (response.data && response.data.success && response.data.data) {
      return mapBackendDocToRecord(response.data.data);
    }
  } catch {
    // Fall back to stored records
  }
  const records = getStoredSubmissions();
  return records.find((r) => r.submissionId === submissionId) || null;
};

/**
 * Deletes a submitted claim by ID from local cache.
 */
export const deleteSubmittedClaim = async (submissionId: string): Promise<boolean> => {
  const records = getStoredSubmissions();
  const filtered = records.filter((r) => r.submissionId !== submissionId);
  saveStoredSubmissions(filtered);
  return true;
};

/**
 * Clears all submitted claims from local cache (testing/diagnostics utility).
 */
export const clearAllSubmittedClaims = (): void => {
  saveStoredSubmissions([]);
};

export default submitClaimForm;
