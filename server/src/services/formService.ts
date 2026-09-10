import { FormSchemaModel } from '../models/FormSchema';
import { FormSchema } from '../types/form';

/**
 * Form Service
 *
 * Encapsulates all database operations and business logic for Form Schemas.
 * Keeps MongoDB queries strictly isolated from controllers and routes.
 */
export const formService = {
  /**
   * Lists all available form schemas.
   * Returns schemas sorted by schemaId and version descending.
   * Excludes MongoDB internal metadata (_id, __v).
   */
  async listFormSchemas(): Promise<FormSchema[]> {
    return FormSchemaModel.find()
      .sort({ schemaId: 1, version: -1 })
      .select('-_id -__v')
      .lean() as unknown as Promise<FormSchema[]>;
  },

  /**
   * Finds the latest version of a form schema by schemaId.
   * Sorts by version descending to guarantee the highest version is returned.
   */
  async findLatestFormSchema(schemaId: string): Promise<FormSchema | null> {
    const cleanId = schemaId.trim();
    return FormSchemaModel.findOne({
      $or: [{ schemaId: cleanId }, { id: cleanId }],
    })
      .sort({ version: -1 })
      .select('-_id -__v')
      .lean() as unknown as Promise<FormSchema | null>;
  },

  /**
   * Finds a specific version of a form schema by schemaId and version number.
   * If version is omitted, retrieves the latest version.
   */
  async findFormSchema(
    schemaId: string,
    version?: number
  ): Promise<FormSchema | null> {
    const cleanId = schemaId.trim();

    if (version !== undefined) {
      return FormSchemaModel.findOne({
        $or: [{ schemaId: cleanId }, { id: cleanId }],
        version,
      })
        .select('-_id -__v')
        .lean() as unknown as Promise<FormSchema | null>;
    }

    return this.findLatestFormSchema(cleanId);
  },

  /**
   * Backward-compatible lookup alias for getFormById
   */
  async getFormById(
    formId: string,
    version?: number
  ): Promise<FormSchema | null> {
    return this.findFormSchema(formId, version);
  },

  /**
   * Retrieves all available version numbers for a given schemaId.
   */
  async getFormVersions(schemaId: string): Promise<number[]> {
    const cleanId = schemaId.trim();
    const records = await FormSchemaModel.find(
      { $or: [{ schemaId: cleanId }, { id: cleanId }] },
      { version: 1, _id: 0 }
    )
      .sort({ version: 1 })
      .lean();

    return records.map((record) => record.version);
  },

  /**
   * Persists or updates a form schema version in the database (Idempotent upsert).
   */
  async saveFormSchema(schemaData: FormSchema): Promise<FormSchema> {
    const doc = await FormSchemaModel.findOneAndUpdate(
      {
        schemaId: schemaData.schemaId,
        version: schemaData.version,
      },
      {
        ...schemaData,
        id: schemaData.id || schemaData.schemaId,
      },
      { upsert: true, new: true, runValidators: true }
    )
      .select('-_id -__v')
      .lean();

    return doc as unknown as FormSchema;
  },
};

export default formService;
