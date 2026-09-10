import { z } from 'zod';
import { FormField, FormSchema, FieldType } from '../types/form';

/**
 * Compact field extraction metadata derived from canonical FormField.
 * Contains strictly the information necessary for the LLM to extract facts.
 */
export interface ExtractionFieldDefinition {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  allowedValues?: string[];
}

/**
 * Complete schema-driven extraction definition for a form schema.
 */
export interface FormExtractionDefinition {
  schemaId: string;
  version: number;
  title: string;
  description?: string;
  fields: Record<string, ExtractionFieldDefinition>;
}

/**
 * Service responsible for converting MongoDB FormSchema documents into
 * compact AI extraction definitions, dynamic Zod schemas, and system prompts.
 */
export class ExtractionSchemaService {
  /**
   * Flattens and extracts relevant field metadata from FormSchema,
   * stripping out internal database identifiers, timestamps, and conditional engine internals.
   *
   * @param schema Retrieved FormSchema document
   * @returns FormExtractionDefinition
   */
  public createExtractionDefinition(schema: FormSchema): FormExtractionDefinition {
    const fieldMap: Record<string, ExtractionFieldDefinition> = {};

    const processField = (field: FormField) => {
      if (!field || !field.id || fieldMap[field.id]) return;

      const allowedValues =
        field.type === 'select' && Array.isArray(field.options)
          ? field.options.map((opt) => String(opt.value))
          : undefined;

      fieldMap[field.id] = {
        id: field.id,
        name: field.name,
        label: field.label,
        type: field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        allowedValues,
      };
    };

    if (Array.isArray(schema.fields)) {
      for (const field of schema.fields) {
        processField(field);
      }
    }

    if (Array.isArray(schema.sections)) {
      for (const section of schema.sections) {
        if (Array.isArray(section.fields)) {
          for (const field of section.fields) {
            processField(field);
          }
        }
      }
    }

    return {
      schemaId: schema.schemaId || schema.id || 'unknown',
      version: schema.version || 1,
      title: schema.title || 'Form Claim',
      description: schema.description,
      fields: fieldMap,
    };
  }

  /**
   * Dynamically constructs a Zod schema matching the exact fields and allowed options
   * defined in the FormExtractionDefinition.
   *
   * @param definition Schema extraction definition
   * @returns Dynamic ZodObject schema for structured LLM parsing
   */
  public generateExtractionZodSchema(
    definition: FormExtractionDefinition
  ): z.ZodObject<Record<string, z.ZodTypeAny>> {
    const shape: Record<string, z.ZodTypeAny> = {};

    for (const [key, field] of Object.entries(definition.fields)) {
      if (field.type === 'select' && field.allowedValues && field.allowedValues.length > 0) {
        const [first, ...rest] = field.allowedValues;
        shape[key] = z
          .enum([first, ...rest], {
            description: `${field.label}. Must be one of: ${field.allowedValues.join(', ')}`,
          })
          .optional();
      } else if (field.type === 'number') {
        shape[key] = z
          .number({
            description: `${field.label} as a numeric value`,
          })
          .optional();
      } else if (field.type === 'checkbox') {
        shape[key] = z
          .boolean({
            description: `${field.label} as a boolean true/false`,
          })
          .optional();
      } else if (field.type === 'date') {
        shape[key] = z
          .string({
            description: `${field.label} formatted as YYYY-MM-DD if determinable`,
          })
          .optional();
      } else {
        // text, textarea, or fallback
        shape[key] = z
          .string({
            description: `${field.label}`,
          })
          .optional();
      }
    }

    return z.object(shape);
  }

  /**
   * Generates a dynamic system prompt grounded in the current form schema's allowed fields.
   *
   * @param definition Schema extraction definition
   * @returns Dynamic system prompt string
   */
  public generateExtractionPrompt(definition: FormExtractionDefinition): string {
    const fieldLines = Object.values(definition.fields).map((field) => {
      let line = `- "${field.id}" (${field.label}, type: ${field.type})`;
      if (field.allowedValues && field.allowedValues.length > 0) {
        line += ` -> Allowed values: [${field.allowedValues.map((v) => `"${v}"`).join(', ')}]`;
      }
      return line;
    });

    return `You are a precision AI data extraction engine for the "${definition.title}" schema (v${definition.version}).
Your sole job is to read an unstructured incident description and extract facts matching the schema's allowed fields.

ALLOWED EXTRACTION FIELDS DERIVED FROM FORM SCHEMA:
${fieldLines.join('\n')}

STRICT EXTRACTION RULES:
1. Fact-Grounded: Only extract facts directly supported by the text. NEVER guess, assume, or extrapolate unmentioned details.
2. Missing Information: If a field is not mentioned, OMIT it. Missing information is normal and expected. Do NOT invent values.
3. Select Options: For select fields, only return values that strictly match one of the allowed values listed above. If text does not match any allowed value, omit the field.
4. Dates: Format dates as YYYY-MM-DD if explicitly mentioned or determinable. Do not invent dates.
5. Numbers: Extract numbers (e.g. model years) as numeric values.
6. Schema Adherence: Only return facts for the allowed fields listed above. Do not introduce unsupported keys.
7. Return strictly valid structured data adhering to the defined schema.`;
  }
}

export const extractionSchemaService = new ExtractionSchemaService();
export default extractionSchemaService;
