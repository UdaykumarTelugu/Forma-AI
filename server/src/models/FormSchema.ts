import mongoose, { Schema } from 'mongoose';
import { FormSchemaDocument } from '../types/form';
import {
  FieldOption,
  ValidationRule,
  ConditionalRule,
  FormField,
  FormSection,
} from '../../../shared/types/form-schema';

// ============================================================================
// 1. Embedded Subdocument Schemas
// ============================================================================

/**
 * Embedded schema for choice options (e.g. select dropdowns)
 */
const fieldOptionSchema = new Schema<FieldOption>(
  {
    label: { type: String, required: true, trim: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { _id: false }
);

/**
 * Embedded schema for declarative field validation rules
 */
const validationRuleSchema = new Schema<ValidationRule>(
  {
    required: { type: Boolean },
    min: { type: Schema.Types.Mixed },
    max: { type: Schema.Types.Mixed },
    minLength: { type: Number },
    maxLength: { type: Number },
    pattern: { type: String },
    message: { type: String },
    type: { type: String },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Embedded schema for conditional visibility rules
 */
const conditionalRuleSchema = new Schema<ConditionalRule>(
  {
    field: { type: String, required: true, trim: true },
    operator: {
      type: String,
      required: true,
      enum: [
        'equals',
        'notEquals',
        'contains',
        'greaterThan',
        'lessThan',
        'in',
        'notIn',
        'exists',
      ],
    },
    value: { type: Schema.Types.Mixed },
    action: {
      type: String,
      enum: ['show', 'hide'],
      default: 'show',
    },
  },
  { _id: false }
);

/**
 * Embedded schema for individual form fields
 */
const formFieldSchema = new Schema<FormField>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'number', 'select', 'checkbox', 'date', 'textarea'],
    },
    placeholder: { type: String },
    defaultValue: { type: Schema.Types.Mixed },
    required: { type: Boolean, default: false },
    options: [fieldOptionSchema],
    validation: validationRuleSchema,
    conditions: [conditionalRuleSchema],
    conditional: conditionalRuleSchema,
    helpText: { type: String },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
  },
  { _id: false }
);

/**
 * Embedded schema for logical form sections
 */
const formSectionSchema = new Schema<FormSection>(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    fields: [formFieldSchema],
  },
  { _id: false }
);

// ============================================================================
// 2. Root Form Schema Definition
// ============================================================================

const formSchemaDef = new Schema<FormSchemaDocument>(
  {
    schemaId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    id: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    fields: {
      type: [formFieldSchema],
      default: [],
    },
    sections: {
      type: [formSectionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// 3. Database Indexes & Hooks
// ============================================================================

// Compound unique index ensuring schemaId + version uniquely identifies a form schema
formSchemaDef.index({ schemaId: 1, version: 1 }, { unique: true });

// Compound index optimized for finding the latest version of a schema
formSchemaDef.index({ schemaId: 1, version: -1 });

// Ensure id alias is synced with schemaId before saving
formSchemaDef.pre('save', function (next) {
  if (!this.id && this.schemaId) {
    this.id = this.schemaId;
  }
  next();
});

export const FormSchemaModel = mongoose.model<FormSchemaDocument>('FormSchema', formSchemaDef);
export default FormSchemaModel;
