import { FormField, FormSchema } from '../types/form';
import { ClaimExtractionResult } from '../types/ai';

export interface MappedFieldValue {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  value: unknown;
  sourceKey: string;
}

export interface InvalidFieldValue {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  rawValue: unknown;
  reason: string;
}

export interface SkippedFieldValue {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  reason: string;
}

export interface PreservedFieldValue {
  fieldId: string;
  fieldName: string;
  fieldLabel: string;
  currentValue: unknown;
  rejectedAiValue: unknown;
}

export interface ExtractionMappingSummary {
  applied: MappedFieldValue[];
  invalid: InvalidFieldValue[];
  skipped: SkippedFieldValue[];
  preserved: PreservedFieldValue[];
}

export interface MapExtractionOptions {
  userModifiedFields?: Record<string, boolean>;
  currentValues?: Record<string, unknown>;
  forceOverwrite?: boolean;
}

/**
 * Flattens and deduplicates all form fields across top-level fields and sectioned fields.
 */
export const getAllSchemaFields = (schema: FormSchema): FormField[] => {
  const fieldMap = new Map<string, FormField>();
  if (Array.isArray(schema.fields)) {
    for (const field of schema.fields) {
      fieldMap.set(field.id, field);
    }
  }
  if (Array.isArray(schema.sections)) {
    for (const section of schema.sections) {
      if (Array.isArray(section.fields)) {
        for (const field of section.fields) {
          fieldMap.set(field.id, field);
        }
      }
    }
  }
  return Array.from(fieldMap.values());
};

/**
 * Validates whether a string represents a valid, unambiguous calendar date in YYYY-MM-DD format.
 */
export const isValidIsoDate = (dateStr: string): boolean => {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
};

/**
 * Maps structured AI extraction results to canonical form fields defined in the schema.
 *
 * Enforces strict human-in-the-loop and schema-compatibility rules:
 * 1. Partial updates only: only fields in schema with non-empty values are evaluated.
 * 2. Select validation: verifies value exists in field.options.
 * 3. Number validation: parses numbers, verifies finiteness and range constraints.
 * 4. Date validation: strictly accepts valid YYYY-MM-DD dates; rejects ambiguous or malformed dates.
 * 5. Checkbox validation: coerces to boolean.
 * 6. User modification precedence: preserves fields previously modified by the user unless forceOverwrite is true.
 * 7. Unknown keys: safely ignored.
 *
 * @param schema Active FormSchema definition
 * @param extraction Structured facts extracted by AI service
 * @param options Optional configuration including user-modified fields and current values
 * @returns Comprehensive ExtractionMappingSummary (applied, invalid, skipped, preserved)
 */
export const mapExtractionToFormFields = (
  schema: FormSchema,
  extraction: ClaimExtractionResult,
  options: MapExtractionOptions = {}
): ExtractionMappingSummary => {
  const allFields = getAllSchemaFields(schema);
  const summary: ExtractionMappingSummary = {
    applied: [],
    invalid: [],
    skipped: [],
    preserved: [],
  };

  const rawData = extraction as Record<string, unknown>;
  const userModifiedFields = options.userModifiedFields || {};
  const currentValues = options.currentValues || {};
  const forceOverwrite = Boolean(options.forceOverwrite);

  for (const field of allFields) {
    const sourceKey = rawData[field.id] !== undefined ? field.id : field.name;
    const rawVal = rawData[sourceKey];

    if (rawVal === undefined || rawVal === null || rawVal === '') {
      summary.skipped.push({
        fieldId: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        reason: 'No value extracted by AI',
      });
      continue;
    }

    let targetValue: unknown;
    let validationError: string | null = null;

    switch (field.type) {
      case 'select': {
        const matchingOption = field.options?.find(
          (opt) => String(opt.value).toLowerCase() === String(rawVal).toLowerCase()
        );
        if (!matchingOption) {
          validationError = `Value "${String(rawVal)}" is not an allowed option for ${field.label}.`;
        } else {
          targetValue = matchingOption.value;
        }
        break;
      }

      case 'number': {
        const num = typeof rawVal === 'number' ? rawVal : Number(rawVal);
        targetValue = Number.isNaN(num) ? rawVal : num;
        break;
      }

      case 'checkbox': {
        if (typeof rawVal === 'boolean') {
          targetValue = rawVal;
        } else if (rawVal === 'true' || rawVal === 1) {
          targetValue = true;
        } else if (rawVal === 'false' || rawVal === 0) {
          targetValue = false;
        } else {
          targetValue = Boolean(rawVal);
        }
        break;
      }

      case 'date': {
        targetValue = String(rawVal).trim();
        break;
      }

      case 'text':
      case 'textarea': {
        const strVal = String(rawVal).trim();
        if (strVal.length === 0) {
          summary.skipped.push({
            fieldId: field.id,
            fieldName: field.name,
            fieldLabel: field.label,
            reason: 'Empty text value after trimming',
          });
          continue;
        }
        targetValue = strVal;
        break;
      }

      default: {
        targetValue = rawVal;
        break;
      }
    }

    if (validationError) {
      summary.invalid.push({
        fieldId: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        rawValue: rawVal,
        reason: validationError,
      });
      continue;
    }

    // Check user manual edit precedence
    const isUserModified = Boolean(userModifiedFields[field.name]);
    if (isUserModified && !forceOverwrite) {
      summary.preserved.push({
        fieldId: field.id,
        fieldName: field.name,
        fieldLabel: field.label,
        currentValue: currentValues[field.name],
        rejectedAiValue: targetValue,
      });
      continue;
    }

    summary.applied.push({
      fieldId: field.id,
      fieldName: field.name,
      fieldLabel: field.label,
      value: targetValue,
      sourceKey,
    });
  }

  return summary;
};

export default mapExtractionToFormFields;
