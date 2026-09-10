/**
 * Forma AI — Client AI Extraction Types
 *
 * Defines TypeScript contracts for unstructured claim extraction on the frontend.
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

export interface ClaimExtractionResult {
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

export interface ExtractClaimRequest {
  text: string;
}

export interface ExtractClaimResponse {
  success: boolean;
  data?: ClaimExtractionResult;
  error?: {
    message: string;
    code?: string;
  };
}
