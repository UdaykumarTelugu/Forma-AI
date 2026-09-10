import mongoose, { Schema } from 'mongoose';
import { FormSubmissionDocument } from '../types/form';

// TODO: Complete submission indexes and validation rules
const formSubmissionDef = new Schema<FormSubmissionDocument>(
  {
    formId: { type: String, required: true, index: true },
    formVersion: { type: Number, required: true },
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

export const FormSubmissionModel = mongoose.model<FormSubmissionDocument>(
  'FormSubmission',
  formSubmissionDef
);
export default FormSubmissionModel;
