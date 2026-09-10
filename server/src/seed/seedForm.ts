import { connectDatabase, disconnectDatabase, isDatabaseConnected } from '../config/database';
import { formService } from '../services/formService';
import { FormSchema } from '../types/form';

/**
 * Forma AI — Canonical Auto Insurance Claim Form Schema
 *
 * Demonstrates:
 * - Complex, realistic field definitions with dot-notation value paths
 * - Declarative validation rules (required, min, max, pattern, minLength)
 * - Multi-level conditional visibility rules:
 *     Level 1: incidentType === 'animal_collision' -> animalSpecies appears
 *     Level 2: animalSpecies === 'deer' -> animalDamageConfirmed appears
 *     Level 3: animalDamageConfirmed === 'yes' -> wildlifeReportNumber appears
 * - Parallel accident branch:
 *     incidentType === 'accident' -> otherVehicleInvolved appears
 *     otherVehicleInvolved === true -> otherVehicleMake & otherVehicleModel appear
 */
export const autoInsuranceClaimSchema: FormSchema = {
  schemaId: 'auto-insurance-claim',
  id: 'auto-insurance-claim',
  title: 'Vehicle Insurance Claim',
  description: 'AI-augmented insurance and incident claim declaration',
  version: 1,
  fields: [
    // --- Incident Details ---
    {
      id: 'incidentType',
      name: 'incident.type',
      label: 'What type of incident occurred?',
      type: 'select',
      placeholder: '-- Select incident type --',
      required: true,
      options: [
        { label: 'Collision with Animal', value: 'animal_collision' },
        { label: 'Motor Vehicle Accident', value: 'accident' },
        { label: 'Theft or Vandalism', value: 'theft' },
        { label: 'Weather / Natural Damage', value: 'weather_damage' },
        { label: 'Other Incident', value: 'other' },
      ],
      validation: {
        required: true,
        message: 'Please select an incident type.',
      },
    },
    {
      id: 'incidentDate',
      name: 'incident.date',
      label: 'Date of Incident',
      type: 'date',
      required: true,
      validation: {
        required: true,
        message: 'Incident date is required.',
      },
    },
    {
      id: 'incidentDescription',
      name: 'incident.description',
      label: 'Incident Description',
      type: 'textarea',
      placeholder: 'Please provide a brief summary of how the incident occurred...',
      validation: {
        minLength: 10,
        message: 'Description must be at least 10 characters long if provided.',
      },
    },

    // --- 3-Level Branching Path: Animal Collision Branch ---
    // Level 1: Depends on incident.type === 'animal_collision'
    {
      id: 'animalSpecies',
      name: 'animalDetails.species',
      label: 'What animal was involved in the collision?',
      type: 'select',
      placeholder: '-- Select species --',
      options: [
        { label: 'Deer', value: 'deer' },
        { label: 'Elk / Moose', value: 'elk_moose' },
        { label: 'Bear', value: 'bear' },
        { label: 'Domestic Animal (Dog, Livestock)', value: 'domestic' },
        { label: 'Other Wildlife', value: 'other' },
      ],
      conditions: [
        {
          field: 'incident.type',
          operator: 'equals',
          value: 'animal_collision',
          action: 'show',
        },
      ],
      validation: {
        required: true,
        message: 'Animal species is required for animal collisions.',
      },
    },
    // Level 2: Depends on animalDetails.species === 'deer'
    {
      id: 'animalDamageConfirmed',
      name: 'animalDetails.damageConfirmed',
      label: 'Was physical evidence of deer collision (hair, biological matter) confirmed?',
      type: 'select',
      placeholder: '-- Select confirmation status --',
      options: [
        { label: 'Yes - Confirmed on vehicle inspection', value: 'yes' },
        { label: 'No - Evidence unconfirmed', value: 'no' },
      ],
      conditions: [
        {
          field: 'animalDetails.species',
          operator: 'equals',
          value: 'deer',
          action: 'show',
        },
      ],
      validation: {
        required: true,
        message: 'Confirmation status is required for deer collision claims.',
      },
    },
    // Level 3: Depends on animalDetails.damageConfirmed === 'yes'
    {
      id: 'wildlifeReportNumber',
      name: 'animalDetails.wildlifeReportNumber',
      label: 'Wildlife Agency / DNR Incident Report Number',
      type: 'text',
      placeholder: 'e.g. DNR-2026-98765',
      conditions: [
        {
          field: 'animalDetails.damageConfirmed',
          operator: 'equals',
          value: 'yes',
          action: 'show',
        },
      ],
      validation: {
        pattern: '^[A-Z0-9-]+$',
        message: 'Report number must contain only letters, numbers, and hyphens.',
      },
    },

    // --- Accident Branch ---
    {
      id: 'otherVehicleInvolved',
      name: 'otherVehicle.involved',
      label: 'Was another vehicle involved in this accident?',
      type: 'checkbox',
      defaultValue: false,
      conditions: [
        {
          field: 'incident.type',
          operator: 'equals',
          value: 'accident',
          action: 'show',
        },
      ],
    },
    {
      id: 'otherVehicleMake',
      name: 'otherVehicle.make',
      label: 'Other Vehicle Make',
      type: 'text',
      placeholder: 'e.g. Chevrolet, Nissan',
      conditions: [
        {
          field: 'otherVehicle.involved',
          operator: 'equals',
          value: true,
          action: 'show',
        },
      ],
      validation: {
        required: true,
        message: 'Other vehicle make is required when another vehicle is involved.',
      },
    },
    {
      id: 'otherVehicleModel',
      name: 'otherVehicle.model',
      label: 'Other Vehicle Model',
      type: 'text',
      placeholder: 'e.g. Silverado, Altima',
      conditions: [
        {
          field: 'otherVehicle.involved',
          operator: 'equals',
          value: true,
          action: 'show',
        },
      ],
      validation: {
        required: true,
        message: 'Other vehicle model is required when another vehicle is involved.',
      },
    },

    // --- Insured Vehicle Information ---
    {
      id: 'vehicleMake',
      name: 'vehicle.make',
      label: 'Vehicle Make',
      type: 'text',
      placeholder: 'e.g. Toyota, Honda, Ford',
      required: true,
      validation: {
        required: true,
        message: 'Vehicle make is required.',
      },
    },
    {
      id: 'vehicleModel',
      name: 'vehicle.model',
      label: 'Vehicle Model',
      type: 'text',
      placeholder: 'e.g. Camry, Civic, F-150',
      required: true,
      validation: {
        required: true,
        message: 'Vehicle model is required.',
      },
    },
    {
      id: 'vehicleYear',
      name: 'vehicle.year',
      label: 'Model Year',
      type: 'number',
      placeholder: 'e.g. 2022',
      required: true,
      validation: {
        required: true,
        min: 1950,
        max: 2030,
        message: 'Year must be between 1950 and 2030.',
      },
    },

    // --- Damage Assessment ---
    {
      id: 'damageType',
      name: 'damage.type',
      label: 'Primary Damage Category',
      type: 'select',
      placeholder: '-- Select damage category --',
      required: true,
      options: [
        { label: 'Windshield / Glass Damage', value: 'windshield' },
        { label: 'Body Panels / Exterior', value: 'body' },
        { label: 'Engine / Mechanical Components', value: 'engine' },
        { label: 'Tires / Wheels / Axle', value: 'tires' },
        { label: 'Multiple Damage Areas', value: 'multiple' },
        { label: 'Other Structural Damage', value: 'other' },
      ],
      validation: {
        required: true,
        message: 'Please select the primary damage category.',
      },
    },
    {
      id: 'damageDescription',
      name: 'damage.description',
      label: 'Detailed Damage Description',
      type: 'textarea',
      placeholder: 'Describe all visible dents, broken glass, fluid leaks, or deployed airbags...',
      required: true,
      validation: {
        required: true,
        minLength: 15,
        message: 'Please provide at least 15 characters describing the damage.',
      },
    },
  ],
  sections: [
    {
      id: 'section-incident',
      title: 'Incident Details',
      description: 'Circumstances and specifics regarding when and how the incident occurred',
      fields: [], // Populated dynamically or can duplicate root fields
    },
    {
      id: 'section-vehicle',
      title: 'Insured Vehicle',
      description: 'Identification details for the covered vehicle',
      fields: [],
    },
    {
      id: 'section-damage',
      title: 'Damage Assessment',
      description: 'Physical inspection and severity categorization',
      fields: [],
    },
  ],
};

// Organize fields into section subsets for structured rendering
autoInsuranceClaimSchema.sections = [
  {
    id: 'section-incident',
    title: 'Incident Details',
    description: 'Circumstances and specifics regarding when and how the incident occurred',
    fields: autoInsuranceClaimSchema.fields?.filter((f) =>
      ['incidentType', 'incidentDate', 'incidentDescription', 'animalSpecies', 'animalDamageConfirmed', 'wildlifeReportNumber', 'otherVehicleInvolved', 'otherVehicleMake', 'otherVehicleModel'].includes(f.id)
    ) || [],
  },
  {
    id: 'section-vehicle',
    title: 'Insured Vehicle',
    description: 'Identification details for the covered vehicle',
    fields: autoInsuranceClaimSchema.fields?.filter((f) =>
      ['vehicleMake', 'vehicleModel', 'vehicleYear'].includes(f.id)
    ) || [],
  },
  {
    id: 'section-damage',
    title: 'Damage Assessment',
    description: 'Physical inspection and severity categorization',
    fields: autoInsuranceClaimSchema.fields?.filter((f) =>
      ['damageType', 'damageDescription'].includes(f.id)
    ) || [],
  },
];

/**
 * Idempotent database seed execution function
 */
export const seedForms = async (): Promise<{ success: boolean; message: string }> => {
  console.log('[Seed] Starting Forma AI form schema seed...');

  try {
    await connectDatabase();
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Seed] Database connection failure: MongoDB is unavailable (${errorMsg}).`);
    console.error('[Seed] Actual database persistence cannot proceed while MongoDB is unavailable.');
    return {
      success: false,
      message: `MongoDB unavailable: ${errorMsg}`,
    };
  }

  try {
    console.log(`[Seed] MongoDB connected. Upserting schema '${autoInsuranceClaimSchema.schemaId}' (version ${autoInsuranceClaimSchema.version})...`);

    // Idempotent upsert via formService
    await formService.saveFormSchema(autoInsuranceClaimSchema);

    // Verify insertion by reading back from MongoDB
    const persisted = await formService.findFormSchema(
      autoInsuranceClaimSchema.schemaId,
      autoInsuranceClaimSchema.version
    );

    if (!persisted) {
      throw new Error(`Failed to retrieve persisted schema '${autoInsuranceClaimSchema.schemaId}' after upsert.`);
    }

    const fieldCount = persisted.fields?.length || 0;
    const sectionCount = persisted.sections?.length || 0;

    console.log(`[Seed] SUCCESS: Form schema '${persisted.title}' (ID: ${persisted.schemaId}, v${persisted.version}) verified in MongoDB.`);
    console.log(`[Seed] Persisted metadata: ${fieldCount} fields, ${sectionCount} sections.`);

    return {
      success: true,
      message: `Successfully seeded and verified '${persisted.schemaId}' v${persisted.version}`,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Seed] Error during form schema persistence:', errorMsg);
    throw error;
  } finally {
    if (isDatabaseConnected()) {
      await disconnectDatabase();
    }
  }
};

// Execute directly if invoked via CLI
if (require.main === module) {
  seedForms()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
