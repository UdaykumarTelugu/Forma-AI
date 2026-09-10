import { FormSchema } from '../../../shared/types/form-schema';

export * from '../../../shared/types/form-schema';

export interface FormSchemaDocument extends FormSchema {
  _id?: string;
}

export interface FormSubmissionDocument {
  _id?: string;
  formId: string;
  formVersion: number;
  data: Record<string, unknown>;
  status: 'draft' | 'submitted' | 'processed';
  createdAt: Date;
  updatedAt: Date;
}
