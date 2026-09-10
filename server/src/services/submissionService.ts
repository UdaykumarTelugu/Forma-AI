import { FormSubmissionModel } from '../models/FormSubmission';
import { FormSubmissionDocument } from '../types/form';

// TODO: Implement submission draft saving, partial patching, and final submission validation
export const submissionService = {
  async createSubmission(
    payload: Partial<FormSubmissionDocument>
  ): Promise<FormSubmissionDocument> {
    // Placeholder implementation
    const submission = new FormSubmissionModel(payload);
    return submission.save();
  },

  async getSubmissionById(id: string): Promise<FormSubmissionDocument | null> {
    // Placeholder implementation
    return FormSubmissionModel.findById(id).lean();
  },

  async updateSubmission(
    id: string,
    data: Record<string, unknown>
  ): Promise<FormSubmissionDocument | null> {
    // Placeholder implementation
    return FormSubmissionModel.findByIdAndUpdate(
      id,
      { $set: { data } },
      { new: true }
    ).lean();
  },

  async finalizeSubmission(id: string): Promise<FormSubmissionDocument | null> {
    // Placeholder implementation
    return FormSubmissionModel.findByIdAndUpdate(
      id,
      { $set: { status: 'submitted' } },
      { new: true }
    ).lean();
  },
};
