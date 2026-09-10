import { ConditionalRule, FormValues, FormField } from '../types/form';

/**
 * Safely resolves a value from a nested or flat form values dictionary using a dot-notation path.
 *
 * Examples:
 * - getNestedValue({ incident: { type: 'accident' } }, 'incident.type') -> 'accident'
 * - getNestedValue({ 'incident.type': 'accident' }, 'incident.type') -> 'accident'
 * - getNestedValue({}, 'incident.type') -> undefined
 */
export function getNestedValue(
  obj: Record<string, unknown> | undefined | null,
  path: string
): unknown {
  if (!obj || !path) return undefined;

  // 1. Check direct key match (flat object)
  if (Object.prototype.hasOwnProperty.call(obj, path)) {
    return obj[path];
  }

  // 2. Traverse dot-separated segments
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
 * Checks equality with sensible type coercion for booleans and numbers.
 */
function evaluateEquals(targetValue: unknown, expectedValue: unknown): boolean {
  if (targetValue === expectedValue) return true;

  // Boolean comparisons (e.g. checkbox state vs expected boolean)
  if (typeof expectedValue === 'boolean') {
    if (targetValue === 'true' && expectedValue === true) return true;
    if (targetValue === 'false' && expectedValue === false) return true;
    return Boolean(targetValue) === expectedValue;
  }

  // Number comparisons
  if (typeof expectedValue === 'number') {
    const num = Number(targetValue);
    return !isNaN(num) && num === expectedValue;
  }

  // Fallback string conversion comparison
  if (targetValue !== undefined && targetValue !== null && expectedValue !== undefined && expectedValue !== null) {
    return String(targetValue) === String(expectedValue);
  }

  return false;
}

/**
 * Checks if target string contains substring, or target array contains expected value.
 */
function evaluateContains(targetValue: unknown, expectedValue: unknown): boolean {
  if (targetValue === undefined || targetValue === null) return false;

  if (Array.isArray(targetValue)) {
    return targetValue.some((item) => evaluateEquals(item, expectedValue));
  }

  if (typeof targetValue === 'string') {
    return targetValue.toLowerCase().includes(String(expectedValue).toLowerCase());
  }

  return false;
}

/**
 * Checks if target numeric value is strictly greater than expected value.
 */
function evaluateGreaterThan(targetValue: unknown, expectedValue: unknown): boolean {
  if (targetValue === undefined || targetValue === null || targetValue === '') return false;
  const t = Number(targetValue);
  const e = Number(expectedValue);
  return !isNaN(t) && !isNaN(e) && t > e;
}

/**
 * Checks if target numeric value is strictly less than expected value.
 */
function evaluateLessThan(targetValue: unknown, expectedValue: unknown): boolean {
  if (targetValue === undefined || targetValue === null || targetValue === '') return false;
  const t = Number(targetValue);
  const e = Number(expectedValue);
  return !isNaN(t) && !isNaN(e) && t < e;
}

/**
 * Checks if target value exists within an expected array of values.
 */
function evaluateIn(targetValue: unknown, expectedValue: unknown): boolean {
  if (targetValue === undefined || targetValue === null) return false;
  if (!Array.isArray(expectedValue)) return false;
  return expectedValue.some((item) => evaluateEquals(targetValue, item));
}

/**
 * Evaluates whether a value meaningfully exists.
 * Returns false for undefined, null, empty string "", and empty array [].
 */
function evaluateExists(targetValue: unknown): boolean {
  if (targetValue === undefined || targetValue === null || targetValue === '') return false;
  if (Array.isArray(targetValue) && targetValue.length === 0) return false;
  return true;
}

/**
 * Evaluates a single conditional rule against current form values.
 * Returns whether the rule dictates that the field should be visible.
 */
export function evaluateSingleRule(
  rule: ConditionalRule,
  formValues: FormValues
): boolean {
  const targetValue = getNestedValue(formValues, rule.field);

  let match = false;
  switch (rule.operator) {
    case 'equals':
      match = evaluateEquals(targetValue, rule.value);
      break;
    case 'notEquals':
      match = !evaluateEquals(targetValue, rule.value);
      break;
    case 'contains':
      match = evaluateContains(targetValue, rule.value);
      break;
    case 'greaterThan':
      match = evaluateGreaterThan(targetValue, rule.value);
      break;
    case 'lessThan':
      match = evaluateLessThan(targetValue, rule.value);
      break;
    case 'in':
      match = evaluateIn(targetValue, rule.value);
      break;
    case 'notIn':
      match = !evaluateIn(targetValue, rule.value);
      break;
    case 'exists':
      match = evaluateExists(targetValue);
      break;
    default:
      match = true;
  }

  const action = rule.action || 'show';
  return action === 'show' ? match : !match;
}

/**
 * Pure evaluator determining whether a field should be visible based on its conditional rules.
 *
 * Multi-Condition Semantics:
 * - Deterministic AND: All conditions must pass for the field to be visible.
 * - If conditions is undefined or empty, returns true (always visible).
 */
export function evaluateConditions(
  conditions: ConditionalRule[] | ConditionalRule | undefined,
  formValues: FormValues
): boolean {
  if (!conditions) return true;

  const rules = Array.isArray(conditions) ? conditions : [conditions];
  if (rules.length === 0) return true;

  return rules.every((rule) => evaluateSingleRule(rule, formValues));
}

/**
 * Alias for backward compatibility with single-rule consumers.
 */
export const evaluateCondition = (
  condition: ConditionalRule | undefined,
  formValues: FormValues
): boolean => {
  return evaluateConditions(condition, formValues);
};

/**
 * Evaluates active visible fields hierarchically, ensuring that multi-level dependent fields
 * are automatically inactive if any parent dependency field is inactive.
 *
 * For example, if incident.type !== 'animal_collision', then animalDetails.species is inactive,
 * and consequently any Level 2/3 child fields (damageConfirmed, wildlifeReportNumber) are
 * also guaranteed to be inactive, even if raw stale values exist in the form values dictionary.
 */
export function filterActiveVisibleFields(
  allFields: FormField[],
  formValues: FormValues
): FormField[] {
  let currentVisible = allFields;
  let changed = true;

  while (changed) {
    const visibleNames = new Set(currentVisible.map((f) => f.name));
    const visibleIds = new Set(currentVisible.map((f) => f.id));

    const nextVisible = currentVisible.filter((field) => {
      const activeConditions =
        field.conditions && field.conditions.length > 0
          ? field.conditions
          : field.conditional
          ? [field.conditional]
          : undefined;

      if (!activeConditions || activeConditions.length === 0) {
        return true;
      }

      // Check that every condition's target field is currently visible
      const rules = Array.isArray(activeConditions) ? activeConditions : [activeConditions];
      for (const rule of rules) {
        if (!visibleNames.has(rule.field) && !visibleIds.has(rule.field)) {
          return false;
        }
      }

      return evaluateConditions(activeConditions, formValues);
    });

    if (nextVisible.length === currentVisible.length) {
      changed = false;
    } else {
      currentVisible = nextVisible;
    }
  }

  return currentVisible;
}

