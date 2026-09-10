import { FormSchema } from '../../../shared/types/form-schema';

export * from '../../../shared/types/form-schema';

/**
 * Standard API envelope returned by backend REST endpoints
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    message: string;
  };
}

export type FormValues = Record<string, unknown>;

export interface FormSubmissionPayload {
  schemaId: string;
  schemaVersion: number;
  values: FormValues;
  submittedAt?: string;
  formId?: string;
  formVersion?: number;
  data?: FormValues;
}

export type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface SubmissionResult {
  success: boolean;
  message?: string;
  payload?: FormSubmissionPayload;
  error?: string;
}

export interface FormState {
  currentForm: FormSchema | null;
  formValues: FormValues;
  isLoading: boolean;
  error: string | null;
}

/**
 * Forma AI — Form Draft Contract (Week 4 Step 1)
 *
 * Represents saved in-progress form values prior to final submission.
 */
export interface FormDraft {
  draftId: string;
  schemaId: string;
  schemaVersion: number;
  values: FormValues;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSaveResult {
  success: boolean;
  draft?: FormDraft;
  error?: string;
}

export interface DraftGetResult {
  success: boolean;
  draft?: FormDraft;
  error?: string;
}

export interface DraftListResult {
  success: boolean;
  drafts: FormDraft[];
  error?: string;
}

export interface DraftDeleteResult {
  success: boolean;
  error?: string;
}

export interface DraftCompatibilityResult {
  compatible: boolean;
  status: 'exact' | 'version_mismatch' | 'incompatible';
  message?: string;
}
