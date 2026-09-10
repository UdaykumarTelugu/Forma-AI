import { z } from 'zod';

// TODO: Complete dynamic validation against schema rules
export const createSubmissionValidator = z.object({
  formId: z.string().min(1, 'Form ID is required'),
  formVersion: z.number().int().positive(),
  data: z.record(z.unknown()),
  status: z.enum(['draft', 'submitted']).default('draft'),
});

export const updateSubmissionValidator = z.object({
  data: z.record(z.unknown()),
});
