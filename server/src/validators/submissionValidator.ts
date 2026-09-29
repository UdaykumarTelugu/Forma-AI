import { z } from 'zod';
import { FormSchema, FormField, ConditionalRule } from '../types/form';

/**
 * Basic Zod validator for initiating or creating a form submission.
 * Preprocesses aliases (schemaId -> formId, values -> data) for contract resilience.
 */
export const createSubmissionValidator = z.preprocess(
  (input) => {
    if (input && typeof input === 'object') {
      const raw = input as Record<string, unknown>;
      return {
        ...raw,
        formId: raw.formId ?? raw.schemaId,
        formVersion: raw.formVersion ?? raw.schemaVersion ?? 1,
        data: raw.data ?? raw.values ?? {},
        status: raw.status ?? 'draft',
      };
    }
    return input;
  },
  z.object({
    formId: z.string().min(1, 'Form ID is required'),
    formVersion: z.number().int().positive().default(1),
    data: z.record(z.unknown()).default({}),
    status: z.enum(['draft', 'submitted', 'processed']).default('draft'),
  })
);

/**
 * Basic Zod validator for incrementally patching submission data or status.
 */
export const updateSubmissionValidator = z.preprocess(
  (input) => {
    if (input && typeof input === 'object') {
      const raw = input as Record<string, unknown>;
      if ('data' in raw || 'values' in raw || 'status' in raw) {
        return {
          data: raw.data ?? raw.values,
          status: raw.status,
        };
      }
      return {
        data: raw,
      };
    }
    return input;
  },
  z.object({
    data: z.record(z.unknown()).optional(),
    status: z.enum(['draft', 'submitted', 'processed']).optional(),
  })
);

/**
 * Resolves a field value from a flat or nested data dictionary via dot-notation path.
 */
export function getNestedValue(
  obj: Record<string, unknown> | undefined | null,
  path: string
): unknown {
  if (!obj || !path) return undefined;

  // 1. Direct key match (flat dictionary)
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  // 2. Traversal through dot-delimited segments (nested object)
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

/**
 * Evaluates a single ConditionalRule against the provided form values.
 */
export function evaluateCondition(
  rule: ConditionalRule,
  data: Record<string, unknown>
): boolean {
  const targetValue = getNestedValue(data, rule.field);
  const expectedValue = rule.value;

  switch (rule.operator) {
    case 'equals':
      if (typeof expectedValue === 'boolean') {
        if (targetValue === 'true' && expectedValue === true) return true;
        if (targetValue === 'false' && expectedValue === false) return true;
        return Boolean(targetValue) === expectedValue;
      }
      if (typeof expectedValue === 'number') {
        const num = Number(targetValue);
        return !isNaN(num) && num === expectedValue;
      }
      if (targetValue !== undefined && targetValue !== null && expectedValue !== undefined && expectedValue !== null) {
        return String(targetValue) === String(expectedValue);
      }
      return targetValue === expectedValue;

    case 'notEquals':
      return !evaluateCondition({ ...rule, operator: 'equals' }, data);

    case 'contains':
      if (targetValue === undefined || targetValue === null) return false;
      if (Array.isArray(targetValue)) {
        return targetValue.some((item) => String(item) === String(expectedValue));
      }
      if (typeof targetValue === 'string') {
        return targetValue.toLowerCase().includes(String(expectedValue).toLowerCase());
      }
      return false;

    case 'greaterThan': {
      if (targetValue === undefined || targetValue === null || targetValue === '') return false;
      const t = Number(targetValue);
      const e = Number(expectedValue);
      return !isNaN(t) && !isNaN(e) && t > e;
    }

    case 'lessThan': {
      if (targetValue === undefined || targetValue === null || targetValue === '') return false;
      const t = Number(targetValue);
      const e = Number(expectedValue);
      return !isNaN(t) && !isNaN(e) && t < e;
    }

    case 'in':
      if (Array.isArray(expectedValue)) {
        return expectedValue.some((item) => String(item) === String(targetValue));
      }
      return false;

    case 'notIn':
      return !evaluateCondition({ ...rule, operator: 'in' }, data);

    case 'exists':
      return targetValue !== undefined && targetValue !== null && targetValue !== '';

    default:
      return true;
  }
}

/**
 * Determines whether a field is currently visible/active based on conditional rules.
 */
export function isFieldActive(
  field: FormField,
  data: Record<string, unknown>
): boolean {
  const rules =
    field.conditions && field.conditions.length > 0
      ? field.conditions
      : field.conditional
      ? [field.conditional]
      : [];

  if (rules.length === 0) return true;

  return rules.every((rule) => {
    const matches = evaluateCondition(rule, data);
    const action = rule.action || 'show';
    return action === 'show' ? matches : !matches;
  });
}

function isValidIsoDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const parsed = new Date(year, month - 1, day);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
  );
}

export interface FieldValidationError {
  field: string;
  message: string;
}

export interface DynamicValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
}

/**
 * Validates a submission data dictionary against dynamic FormSchema rules.
 * Honors conditional branching: only active/visible fields are validated.
 */
export function validateSubmissionAgainstSchema(
  schema: FormSchema,
  data: Record<string, unknown>
): DynamicValidationResult {
  const errors: FieldValidationError[] = [];

  // 1. Gather all schema fields (flatten sections and root fields)
  const fieldMap = new Map<string, FormField>();
  if (Array.isArray(schema.fields)) {
    for (const f of schema.fields) {
      fieldMap.set(f.name, f);
    }
  }
  if (Array.isArray(schema.sections)) {
    for (const section of schema.sections) {
      if (Array.isArray(section.fields)) {
        for (const f of section.fields) {
          fieldMap.set(f.name, f);
        }
      }
    }
  }

  // 2. Validate all active fields against declarative schema rules
  for (const field of fieldMap.values()) {
    if (!isFieldActive(field, data)) {
      continue;
    }

    const value = getNestedValue(data, field.name);
    const v = field.validation;
    const isRequired = Boolean(field.required || v?.required);

    const isEmpty =
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.trim() === '') ||
      (field.type === 'checkbox' && value !== true);

    if (isRequired && isEmpty) {
      errors.push({
        field: field.name,
        message: v?.message || `${field.label} is required.`,
      });
      continue;
    }

    if (isEmpty) {
      continue;
    }

    // Select option membership
    if (field.type === 'select' && Array.isArray(field.options) && field.options.length > 0) {
      const match = field.options.some((opt) => String(opt.value) === String(value));
      if (!match) {
        errors.push({
          field: field.name,
          message: `"${String(value)}" is not an allowed option for ${field.label}.`,
        });
      }
    }

    // Number range constraints
    if (field.type === 'number') {
      const num = typeof value === 'number' ? value : Number(value);
      if (Number.isNaN(num) || !Number.isFinite(num)) {
        errors.push({
          field: field.name,
          message: `${field.label} must be a valid number.`,
        });
      } else {
        if (v?.min !== undefined && num < Number(v.min)) {
          errors.push({
            field: field.name,
            message: v.message || `${field.label} must be at least ${v.min}.`,
          });
        }
        if (v?.max !== undefined && num > Number(v.max)) {
          errors.push({
            field: field.name,
            message: v.message || `${field.label} cannot exceed ${v.max}.`,
          });
        }
      }
    }

    // Text & textarea length and pattern constraints
    if (field.type === 'text' || field.type === 'textarea') {
      const str = String(value);
      if (v?.minLength !== undefined && str.length < v.minLength) {
        errors.push({
          field: field.name,
          message: v.message || `${field.label} must be at least ${v.minLength} characters.`,
        });
      }
      if (v?.maxLength !== undefined && str.length > v.maxLength) {
        errors.push({
          field: field.name,
          message: v.message || `${field.label} cannot exceed ${v.maxLength} characters.`,
        });
      }
      if (v?.pattern) {
        try {
          const regex = new RegExp(v.pattern);
          if (!regex.test(str)) {
            errors.push({
              field: field.name,
              message: v.message || `${field.label} format is invalid.`,
            });
          }
        } catch {
          // ignore malformed regex
        }
      }
    }

    // Date constraints
    if (field.type === 'date') {
      const dateStr = String(value).trim();
      if (!isValidIsoDate(dateStr)) {
        errors.push({
          field: field.name,
          message: v?.message || `${field.label} must be a valid date in YYYY-MM-DD format.`,
        });
      } else {
        if (v?.min && dateStr < String(v.min)) {
          errors.push({
            field: field.name,
            message: v.message || `${field.label} cannot be earlier than ${v.min}.`,
          });
        }
        if (v?.max && dateStr > String(v.max)) {
          errors.push({
            field: field.name,
            message: v.message || `${field.label} cannot be later than ${v.max}.`,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
