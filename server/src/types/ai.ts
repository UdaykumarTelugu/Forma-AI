/**
 * Forma AI — AI Extraction Types & Contracts
 *
 * Defines the contract for unstructured claim extraction requests and structured outputs.
 * Extraction fields derive dynamically from canonical FormField definitions in the form schema.
 */

export type ExtractedIncidentType =
  | 'animal_collision'
  | 'accident'
  | 'theft'
  | 'weather_damage'
  | 'other';

export type ExtractedAnimalSpecies =
  | 'deer'
  | 'elk_moose'
  | 'bear'
  | 'domestic'
  | 'other';

export type ExtractedDamageConfirmed = 'yes' | 'no';

export type ExtractedDamageType =
  | 'windshield'
  | 'body'
  | 'engine'
  | 'tires'
  | 'multiple'
  | 'other';

/**
 * Validated facts extracted from unstructured claim text.
 * Represents schema-driven extraction values.
 */
export interface ClaimExtractionResult extends Record<string, unknown> {
  incidentType?: ExtractedIncidentType;
  incidentDate?: string;
  incidentDescription?: string;
  animalSpecies?: ExtractedAnimalSpecies;
  animalDamageConfirmed?: ExtractedDamageConfirmed;
  wildlifeReportNumber?: string;
  otherVehicleInvolved?: boolean;
  otherVehicleMake?: string;
  otherVehicleModel?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  damageType?: ExtractedDamageType;
  damageDescription?: string;
}

/**
 * Inbound HTTP request payload for AI extraction.
 * Supports an optional schemaId to target specific form definitions.
 */
export interface ExtractClaimRequest {
  text: string;
  schemaId?: string;
}

/**
 * Standard API envelope for extraction responses.
 */
export interface ExtractClaimResponse {
  success: boolean;
  data?: ClaimExtractionResult;
  error?: {
    message: string;
    code?: string;
  };
}
