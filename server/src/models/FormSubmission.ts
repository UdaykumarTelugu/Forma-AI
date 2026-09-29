import mongoose, { Schema } from 'mongoose';
import { FormSubmissionDocument } from '../types/form';

// Form submission schema definition with indexing and validation
const formSubmissionDef = new Schema<FormSubmissionDocument>(
  {
    formId: { type: String, required: true, index: true },
    formVersion: { type: Number, required: true, min: 1 },
    data: { type: Schema.Types.Mixed, required: true, default: {} },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'processed'],
      default: 'draft',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for querying submissions by form/status and sorting by date
formSubmissionDef.index({ formId: 1, status: 1 });
formSubmissionDef.index({ createdAt: -1 });

export const FormSubmissionModel = mongoose.model<FormSubmissionDocument>(
  'FormSubmission',
  formSubmissionDef
);
export default FormSubmissionModel;
