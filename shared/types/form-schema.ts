/**
 * Forma AI — Canonical Form Schema Contract
 *
 * This module defines the canonical TypeScript contract for backend-driven
 * dynamic forms across the Forma AI platform. It serves as the single source
 * of truth shared across MongoDB, Express backend, REST APIs, React frontend,
 * and the Dynamic Form Renderer.
 */

// ============================================================================
// 1. Field Types
// ============================================================================

/**
 * Supported form field control types.
 * Constrained to the MVP set; extensible for future specialized widgets.
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'textarea';

// ============================================================================
// 2. Options (Selectable Fields)
// ============================================================================

/**
 * Allowed primitive value types for selectable field options.
 */
export type FieldOptionValue = string | number | boolean;

/**
 * Option item for selection-based controls (e.g. dropdowns, radios).
 */
export interface FieldOption {
  /** User-visible text */
  label: string;
  /** Underlying primitive value stored in form state */
  value: FieldOptionValue;
}

// ============================================================================
// 3. Validation Rules
// ============================================================================

/**
 * Declarative validation constraints attached to a form field.
 * Allows the backend schema to control validation without hardcoded component logic.
 */
export interface ValidationRule {
  /** Whether the field is mandatory */
  required?: boolean;
  /** Minimum numeric value, minimum date string, or minimum length constraint */
  min?: number | string;
  /** Maximum numeric value, maximum date string, or maximum length constraint */
  max?: number | string;
  /** Minimum character length for text/textarea inputs */
  minLength?: number;
  /** Maximum character length for text/textarea inputs */
  maxLength?: number;
  /** Regular expression pattern string (e.g. '^[A-Z0-9_-]+$') */
  pattern?: string;
  /** User-facing error message displayed when validation fails */
  message?: string;
  /** Optional rule type indicator for rule-array formats (e.g. 'required', 'pattern') */
  type?: string;
  /** Optional comparison value for rule-array formats */
  value?: string | number | boolean;
}

// ============================================================================
// 4. Conditional Visibility & Rules
// ============================================================================

/**
 * Comparison operators for evaluating conditional rules between form fields.
 */
export type ConditionalOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'greaterThan'
  | 'lessThan'
  | 'in'
  | 'notIn'
  | 'exists';

/**
 * Action executed when a conditional rule evaluates to true.
 */
export type ConditionalAction = 'show' | 'hide';

/**
 * Primitive or collection values supported by conditional comparisons.
 */
export type ConditionalValue =
  | string
  | number
  | boolean
  | Array<string | number>;

/**
 * Conditional rule defining dynamic visibility or activation of a field.
 * Enables declarative branching logic driven by form state values.
 *
 * Example:
 * ```json
 * {
 *   "field": "incidentType",
 *   "operator": "equals",
 *   "value": "animal_collision",
 *   "action": "show"
 * }
 * ```
 */
export interface ConditionalRule {
  /** Target field name or dot-notation path (e.g. 'incidentType', 'vehicle.make') */
  field: string;
  /** Comparison operator */
  operator: ConditionalOperator;
  /** Expected value or set of values to evaluate against (optional for unary 'exists') */
  value?: ConditionalValue;
  /** Visibility behavior when condition evaluates to true. Defaults to 'show'. */
  action?: ConditionalAction;
}

// ============================================================================
// 5. Form Field Definition
// ============================================================================

/**
 * Complete specification for an individual form field.
 * Provides all metadata required by the dynamic field renderer and form state manager.
 */
export interface FormField {
  /** Unique identifier for the field within the schema */
  id: string;
  /** Value path used by form state (supports dot-notation, e.g. 'driver.contact.phone') */
  name: string;
  /** User-facing display label */
  label: string;
  /** Input control type */
  type: FieldType;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional initial default value */
  defaultValue?: string | number | boolean | Array<string | number>;
  /** Convenience flag indicating whether the field is required */
  required?: boolean;
  /** Selectable choices (primarily used when type is 'select') */
  options?: FieldOption[];
  /** Validation rules defined for this field */
  validation?: ValidationRule;
  /** Conditional rules controlling dynamic visibility of this field */
  conditions?: ConditionalRule[];
  /** Single conditional rule alias for backward compatibility */
  conditional?: ConditionalRule;
  /** Contextual help or hint text displayed beneath the field */
  helpText?: string;
  /** Whether the field is disabled from user interaction */
  disabled?: boolean;
  /** Whether the field is read-only */
  readonly?: boolean;
}

// ============================================================================
// 6. Form Section Definition
// ============================================================================

/**
 * Logical section grouping related form fields (e.g. 'Claimant Information').
 */
export interface FormSection {
  /** Unique section identifier */
  id: string;
  /** Section heading title */
  title: string;
  /** Optional descriptive subtitle for the section */
  description?: string;
  /** Fields contained within this section */
  fields: FormField[];
}

// ============================================================================
// 7. Form Schema Definition (Root)
// ============================================================================

/**
 * Root schema representing a complete backend-driven dynamic form.
 *
 * Supports flat field definitions via `fields` as well as structured sectioned
 * layouts via `sections`. Encapsulates versioning to support evolving form schemas.
 */
export interface FormSchema {
  /** Unique canonical schema identifier (e.g. 'auto-insurance-claim') */
  schemaId: string;
  /** Compatibility identifier alias */
  id?: string;
  /** Human-readable title of the form */
  title: string;
  /** Optional description of the form's purpose */
  description?: string;
  /** Monotonically increasing schema version number */
  version: number;
  /** Direct flat list of form fields */
  fields?: FormField[];
  /** Optional logical sections grouping form fields */
  sections?: FormSection[];
  /** ISO timestamp of schema creation */
  createdAt?: string;
  /** ISO timestamp of last schema modification */
  updatedAt?: string;
}
