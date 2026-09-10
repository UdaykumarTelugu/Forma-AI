import { RegisterOptions } from 'react-hook-form';
import { FormField, ValidationRule, FormValues } from '../types/form';
import { getNestedValue } from './conditionalLogic';

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
 * Validates a single form field value against all schema rules defined on the FormField.
 *
 * Checks in order:
 * 1. Required constraints (presence check)
 * 2. Select option membership
 * 3. Numeric constraints (finite number, min, max)
 * 4. Text/textarea constraints (minLength, maxLength, regex pattern)
 * 5. Date constraints (valid ISO format, min, max)
 *
 * @param field The FormField definition containing type, options, and validation rules
 * @param value The current value to validate
 * @returns Error message string if invalid, or null if valid
 */
export const validateField = (field: FormField, value: unknown): string | null => {
  const v = field.validation;
  const isRequired = Boolean(field.required || v?.required);

  // 1. Required Check
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (typeof value === 'string' && value.trim() === '') ||
    (field.type === 'checkbox' && value !== true);

  if (isRequired && isEmpty) {
    return v?.message || `${field.label} is required.`;
  }

  // If empty and not required, field is valid
  if (isEmpty) {
    return null;
  }

  // 2. Select Option Membership
  if (field.type === 'select') {
    if (Array.isArray(field.options) && field.options.length > 0) {
      const match = field.options.some((opt) => String(opt.value) === String(value));
      if (!match) {
        return `"${String(value)}" is not an allowed option for ${field.label}.`;
      }
    }
  }

  // 3. Number Type & Range Constraints
  if (field.type === 'number') {
    const num = typeof value === 'number' ? value : Number(value);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      return `${field.label} must be a valid number.`;
    }
    if (v?.min !== undefined && num < Number(v.min)) {
      return v.message || `${field.label} must be at least ${v.min}.`;
    }
    if (v?.max !== undefined && num > Number(v.max)) {
      return v.message || `${field.label} cannot exceed ${v.max}.`;
    }
  }

  // 4. Text & Textarea Length & Pattern Constraints
  if (field.type === 'text' || field.type === 'textarea') {
    const str = String(value);
    if (v?.minLength !== undefined && str.length < v.minLength) {
      return v.message || `${field.label} must be at least ${v.minLength} characters.`;
    }
    if (v?.maxLength !== undefined && str.length > v.maxLength) {
      return v.message || `${field.label} cannot exceed ${v.maxLength} characters.`;
    }
    if (v?.pattern) {
      try {
        const regex = new RegExp(v.pattern);
        if (!regex.test(str)) {
          return v.message || `${field.label} format is invalid.`;
        }
      } catch {
        // Safe fallback if regex is malformed in schema
      }
    }
  }

  // 5. Date Constraints
  if (field.type === 'date') {
    const dateStr = String(value).trim();
    if (!isValidIsoDate(dateStr)) {
      return v?.message || `${field.label} must be a valid date in YYYY-MM-DD format.`;
    }
    if (v?.min && dateStr < String(v.min)) {
      return v.message || `${field.label} cannot be earlier than ${v.min}.`;
    }
    if (v?.max && dateStr > String(v.max)) {
      return v.message || `${field.label} cannot be later than ${v.max}.`;
    }
  }

  return null;
};

/**
 * Validates a single value against standalone ValidationRule(s).
 * Retained for backward compatibility.
 */
export const validateFieldValue = (
  value: unknown,
  validation?: ValidationRule | ValidationRule[]
): string | null => {
  if (!validation) return null;

  const rules = Array.isArray(validation) ? validation : [validation];

  for (const rule of rules) {
    if (rule.required || rule.type === 'required') {
      if (value === undefined || value === null || value === '' || value === false) {
        return rule.message || 'This field is required';
      }
    }
    if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || `Minimum length is ${rule.minLength} characters`;
    }
    if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || `Maximum length is ${rule.maxLength} characters`;
    }
    if (rule.pattern && typeof value === 'string') {
      try {
        const reg = new RegExp(rule.pattern);
        if (!reg.test(value)) {
          return rule.message || 'Value format is invalid';
        }
      } catch {
        // ignore
      }
    }
  }

  return null;
};

/**
 * Builds React Hook Form RegisterOptions from schema field validation metadata.
 * Uses validateField to ensure AI and manual inputs share the exact same validation pipeline.
 */
export const buildFieldValidationRules = (field: FormField): RegisterOptions => {
  return {
    validate: (value: unknown) => {
      const errorMsg = validateField(field, value);
      if (errorMsg) return errorMsg;
      return true;
    },
  };
};

/**
 * Form Readiness statuses:
 * - 'READY': All active required fields are filled and 0 active validation errors exist.
 * - 'NEEDS REVIEW': 1 or more active visible fields have validation errors.
 * - 'INCOMPLETE': 0 active errors, but 1 or more active required fields are missing/empty.
 */
export type FormReadiness = 'READY' | 'NEEDS REVIEW' | 'INCOMPLETE';

export interface FormReadinessResult {
  status: FormReadiness;
  missingRequired: FormField[];
  activeErrors: { fieldName: string; message: string }[];
  unreviewedAiFields: string[];
  summaryMessage: string;
}

/**
 * Computes form readiness based on active visible fields, current form values,
 * active validation errors, and unresolved AI review requirements.
 *
 * Respects conditional visibility: hidden conditional fields never block completion,
 * count as active errors, or require human review.
 *
 * @param activeVisibleFields Currently visible form fields (post conditional logic)
 * @param currentValues Current form values dictionary
 * @param errors Current React Hook Form errors object
 * @param unreviewedAiFieldNames Optional list of field names that are unreviewed AI suggestions
 * @returns FormReadinessResult
 */
export const computeFormReadiness = (
  activeVisibleFields: FormField[],
  currentValues: FormValues,
  errors: Record<string, unknown>,
  unreviewedAiFieldNames: string[] = []
): FormReadinessResult => {
  const activeErrors: { fieldName: string; message: string }[] = [];
  const missingRequired: FormField[] = [];

  // Filter unreviewed AI fields strictly to currently active visible fields
  const activeVisibleFieldNames = new Set(activeVisibleFields.map((f) => f.name));
  const activeUnreviewedAi = unreviewedAiFieldNames.filter((name) =>
    activeVisibleFieldNames.has(name)
  );

  for (const field of activeVisibleFields) {
    // 1. Check if this active field has an error in RHF errors
    const errorObj = getNestedValue(errors, field.name);
    if (errorObj && typeof errorObj === 'object') {
      const msg = (errorObj as { message?: string }).message || `${field.label} is invalid.`;
      activeErrors.push({ fieldName: field.name, message: msg });
      continue;
    }

    // Also run validateField on current value to catch any pending uncommitted validation
    const val = getNestedValue(currentValues, field.name);
    const validationError = validateField(field, val);
    const isRequired = Boolean(field.required || field.validation?.required);

    const isEmpty =
      val === undefined ||
      val === null ||
      val === '' ||
      (typeof val === 'string' && val.trim() === '') ||
      (field.type === 'checkbox' && val !== true);

    if (validationError) {
      if (isEmpty && isRequired) {
        missingRequired.push(field);
      } else {
        activeErrors.push({ fieldName: field.name, message: validationError });
      }
    } else if (isEmpty && isRequired) {
      missingRequired.push(field);
    }
  }

  if (activeErrors.length > 0) {
    return {
      status: 'NEEDS REVIEW',
      missingRequired,
      activeErrors,
      unreviewedAiFields: activeUnreviewedAi,
      summaryMessage: `${activeErrors.length} field(s) require review or correction before submission.`,
    };
  }

  if (missingRequired.length > 0) {
    return {
      status: 'INCOMPLETE',
      missingRequired,
      activeErrors: [],
      unreviewedAiFields: activeUnreviewedAi,
      summaryMessage: `${missingRequired.length} required field(s) still need to be completed.`,
    };
  }

  if (activeUnreviewedAi.length > 0) {
    return {
      status: 'NEEDS REVIEW',
      missingRequired: [],
      activeErrors: [],
      unreviewedAiFields: activeUnreviewedAi,
      summaryMessage: `${activeUnreviewedAi.length} AI-suggested field(s) require confirmation before submission.`,
    };
  }

  return {
    status: 'READY',
    missingRequired: [],
    activeErrors: [],
    unreviewedAiFields: [],
    summaryMessage: 'All required fields are valid and complete. Ready for submission.',
  };
};

/**
 * Assembles a sanitized final form submission payload containing ONLY currently active,
 * visible fields according to conditional visibility rules.
 *
 * Inactive branch fields (e.g. animalDetails.species when incident.type === 'theft')
 * are strictly omitted from the payload, preventing stale or hidden conditional values
 * from leaking into backend submissions.
 *
 * Preserves nested path structure if field.name contains dot-notation.
 *
 * @param values Raw form values dictionary from React Hook Form
 * @param activeVisibleFields Currently active/visible FormField definitions
 * @returns Cleaned FormValues dictionary containing only active fields
 */
export const cleanSubmissionPayload = (
  values: FormValues,
  activeVisibleFields: FormField[]
): FormValues => {
  const cleaned: FormValues = {};

  for (const field of activeVisibleFields) {
    const val = getNestedValue(values, field.name);
    // Include value if defined (including false, 0, or empty strings if present)
    if (val !== undefined) {
      if (field.name.includes('.')) {
        const segments = field.name.split('.');
        let current = cleaned as Record<string, unknown>;
        for (let i = 0; i < segments.length - 1; i++) {
          const seg = segments[i];
          if (typeof current[seg] !== 'object' || current[seg] === null) {
            current[seg] = {};
          }
          current = current[seg] as Record<string, unknown>;
        }
        current[segments[segments.length - 1]] = val;
      } else {
        cleaned[field.name] = val;
      }
    }
  }

  return cleaned;
};

