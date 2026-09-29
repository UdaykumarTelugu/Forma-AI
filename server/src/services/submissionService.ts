import mongoose from 'mongoose';
import { FormSubmissionModel } from '../models/FormSubmission';
import { FormSubmissionDocument } from '../types/form';
import {
  createSubmissionValidator,
  updateSubmissionValidator,
  validateSubmissionAgainstSchema,
} from '../validators/submissionValidator';
import { formService } from './formService';

export class SubmissionValidationError extends Error {
  public status: number = 400;
  public validationErrors: unknown[];

  constructor(message: string, validationErrors: unknown[]) {
    super(message);
    this.name = 'SubmissionValidationError';
    this.validationErrors = validationErrors;
  }
}

export class SubmissionStateError extends Error {
  public status: number = 400;

  constructor(message: string) {
    super(message);
    this.name = 'SubmissionStateError';
  }
}


/**
 * Submission Service
 *
 * Encapsulates the complete claim submission lifecycle:
 * 1. Create a submission draft or initial submission record
 * 2. Retrieve submission records by identifier
 * 3. Incrementally update partially completed form data
 * 4. Finalize and validate submissions against schema rules
 * 5. Persist the submission lifecycle in MongoDB
 */
export const submissionService = {
  /**
   * Creates a new submission document in MongoDB.
   * Validates the basic submission payload and defaults status to 'draft'.
   */
  async createSubmission(
    payload: Partial<FormSubmissionDocument> | Record<string, unknown>
  ): Promise<FormSubmissionDocument> {
    const validated = createSubmissionValidator.parse(payload);

    const submission = new FormSubmissionModel({
      formId: validated.formId,
      formVersion: validated.formVersion,
      data: validated.data,
      status: validated.status || 'draft',
    });

    const saved = await submission.save();
    return saved.toObject ? saved.toObject() : saved;
  },

  /**
   * Retrieves an existing submission by its MongoDB ObjectId.
   * Returns null if ID is invalid or document does not exist.
   */
  async getSubmissionById(id: string): Promise<FormSubmissionDocument | null> {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    return FormSubmissionModel.findById(id).lean();
  },

  /**
   * Incrementally updates an existing submission's form data or status.
   * Preserves formId and formVersion to protect schema contract integrity.
   */
  async updateSubmission(
    id: string,
    update: Record<string, unknown>
  ): Promise<FormSubmissionDocument | null> {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const validated = updateSubmissionValidator.parse(update);

    const existing = await FormSubmissionModel.findById(id);
    if (!existing) {
      return null;
    }

    if (existing.status === 'submitted') {
      throw new SubmissionStateError('Cannot modify a submission that has already been submitted.');
    }

    if (existing.status !== 'draft') {
      throw new SubmissionStateError(
        `Cannot modify a submission with status '${existing.status}'. Only drafts can be modified.`
      );
    }

    // Update only the provided form data (merges into existing data)
    if (validated.data !== undefined) {
      existing.data = {
        ...(existing.data || {}),
        ...validated.data,
      };
      existing.markModified('data');
    }

    // Update status if provided
    if (validated.status !== undefined) {
      existing.status = validated.status;
    }

    // Explicitly preserve formId and formVersion (unchanged)

    const saved = await existing.save();
    return saved.toObject ? saved.toObject() : saved;
  },

  /**
   * Finalizes an existing submission by validating active schema rules
   * and updating the submission status from 'draft' to 'submitted'.
   * Never silently creates a new submission if the record is missing.
   */
  async finalizeSubmission(id: string): Promise<FormSubmissionDocument | null> {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }

    const existing = await FormSubmissionModel.findById(id);
    if (!existing) {
      return null;
    }

    // Perform dynamic schema validation if schema is registered
    if (existing.formId) {
      const schema = await formService.findFormSchema(
        existing.formId,
        existing.formVersion
      );
      if (schema) {
        const validation = validateSubmissionAgainstSchema(schema, existing.data || {});
        if (!validation.isValid) {
          const errorMsg = validation.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join('; ');
          throw new SubmissionValidationError(
            `Submission validation failed: ${errorMsg}`,
            validation.errors
          );
        }
      }
    }

    existing.status = 'submitted';
    const saved = await existing.save();
    return saved.toObject ? saved.toObject() : saved;
  },

  /**
   * Lists submissions optionally filtered by formId or status.
   */
  async listSubmissions(filter?: {
    formId?: string;
    status?: string;
  }): Promise<FormSubmissionDocument[]> {
    const query: Record<string, unknown> = {};
    if (filter?.formId) query.formId = filter.formId;
    if (filter?.status) query.status = filter.status;
    return FormSubmissionModel.find(query).sort({ createdAt: -1 }).lean();
  },

  /**
   * Deletes a submission record by MongoDB ID.
   */
  async deleteSubmission(id: string): Promise<boolean> {
    if (!id || typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    const doc = await FormSubmissionModel.findById(id);
    if (!doc) {
      return false;
    }
    if (doc.status === 'submitted') {
      throw new SubmissionStateError('Cannot delete a submission that has already been submitted.');
    }
    const result = await FormSubmissionModel.findByIdAndDelete(id);
    return Boolean(result);
  },
};

export default submissionService;
