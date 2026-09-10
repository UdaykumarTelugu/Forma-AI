import { z } from 'zod';

// TODO: Complete detailed Zod schemas for form creation and updates
export const createFormSchemaValidator = z.object({
  id: z.string().min(1, 'Form ID is required'),
  title: z.string().min(1, 'Form title is required'),
  description: z.string().optional(),
  version: z.number().int().positive().default(1),
  sections: z.array(z.any()).default([]),
});

export const updateFormSchemaValidator = createFormSchemaValidator.partial();
