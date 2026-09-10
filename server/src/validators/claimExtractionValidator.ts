import { z } from 'zod';

/**
 * Validates the inbound HTTP request body for the claim extraction endpoint.
 */
export const extractClaimRequestSchema = z.object({
  text: z
    .string({
      required_error: 'Claim text is required for extraction',
      invalid_type_error: 'Claim text must be a string',
    })
    .trim()
    .min(1, 'Claim text cannot be empty')
    .max(5000, 'Claim text cannot exceed 5000 characters'),
  schemaId: z
    .string()
    .trim()
    .min(1, 'schemaId cannot be empty if provided')
    .optional(),
});

export type ExtractClaimRequestInput = z.infer<typeof extractClaimRequestSchema>;

/**
 * Canonical fallback Zod schema for auto-insurance claim extraction.
 * Dynamic schemas generated via extractionSchemaService take precedence for schema-driven extraction.
 */
export const claimExtractionSchema = z.object({
  incidentType: z
    .enum(['animal_collision', 'accident', 'theft', 'weather_damage', 'other'], {
      description: 'The category of incident that occurred',
    })
    .optional(),
  incidentDate: z
    .string({
      description: 'The date or timeframe when the incident occurred, formatted as YYYY-MM-DD if determinable',
    })
    .optional(),
  incidentDescription: z
    .string({
      description: 'A concise summary of the incident circumstances directly stated by the user',
    })
    .optional(),
  animalSpecies: z
    .enum(['deer', 'elk_moose', 'bear', 'domestic', 'other'], {
      description: 'The species of animal involved in an animal collision',
    })
    .optional(),
  animalDamageConfirmed: z
    .enum(['yes', 'no'], {
      description: 'Whether physical biological evidence was confirmed on the vehicle',
    })
    .optional(),
  wildlifeReportNumber: z
    .string({
      description: 'Agency or DNR wildlife incident report number if explicitly provided',
    })
    .optional(),
  otherVehicleInvolved: z
    .boolean({
      description: 'True if another motor vehicle was involved in a collision',
    })
    .optional(),
  otherVehicleMake: z
    .string({
      description: 'The manufacturer/make of the other vehicle involved (e.g. Toyota, Chevrolet)',
    })
    .optional(),
  otherVehicleModel: z
    .string({
      description: 'The model of the other vehicle involved (e.g. Camry, Silverado)',
    })
    .optional(),
  vehicleMake: z
    .string({
      description: 'The manufacturer/make of the insured vehicle (e.g. Honda, Ford, BMW)',
    })
    .optional(),
  vehicleModel: z
    .string({
      description: 'The model name of the insured vehicle (e.g. Civic, Accord, F-150)',
    })
    .optional(),
  vehicleYear: z
    .number({
      description: 'The 4-digit model year of the vehicle (e.g. 2022)',
    })
    .int()
    .min(1900)
    .max(2030)
    .optional(),
  damageType: z
    .enum(['windshield', 'body', 'engine', 'tires', 'multiple', 'other'], {
      description: 'Primary physical damage category on the vehicle',
    })
    .optional(),
  damageDescription: z
    .string({
      description: 'Specific physical damages explicitly detailed in the text (e.g. shattered glass, dented bumper)',
    })
    .optional(),
});

export type ValidatedClaimExtraction = z.infer<typeof claimExtractionSchema>;
