import { FormSubmissionPayload, SubmissionResult } from '../types/form';

/**
  * Forma AI — Submission Service Abstraction
  *
  * Serves as the typed boundary between the frontend form lifecycle (ClaimFormPage)
  * and future backend persistence (Week 4).
  *
  * Enforces the contract:
  * - schemaId: string
  * - schemaVersion: number
  * - values: FormValues (active, validated fields only)
  * - submittedAt?: string (ISO 8601 timestamp)
  */
export const submitClaimForm = async (
  payload: FormSubmissionPayload
): Promise<SubmissionResult> => {
  // Validate presence of core contract fields
  if (!payload.schemaId) {
    return {
      success: false,
      error: 'Submission contract violation: schemaId is missing.',
    };
  }

  if (typeof payload.schemaVersion !== 'number') {
    return {
      success: false,
      error: 'Submission contract violation: schemaVersion must be a number.',
    };
  }

  if (!payload.values || typeof payload.values !== 'object') {
    return {
      success: false,
      error: 'Submission contract violation: values payload is missing or invalid.',
    };
  }

  // Realistic network boundary simulation (Week 4 will wire to MongoDB persistence endpoint)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        message: 'Form submitted successfully (submission contract verified).',
        payload: {
          ...payload,
          submittedAt: payload.submittedAt || new Date().toISOString(),
        },
      });
    }, 250);
  });
};
