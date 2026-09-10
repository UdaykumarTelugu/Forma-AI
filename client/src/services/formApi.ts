import apiClient from './api';
import { FormSchema, ApiResponse, FormSubmissionPayload } from '../types/form';

/**
 * Form Schema API Client
 *
 * Provides typed functions to interact with the backend /api/forms endpoints.
 * Unwraps the backend ApiResponse<T> envelope so consumers receive domain types directly.
 */
export const formApi = {
  /**
   * Retrieves the latest version of a form schema by schemaId.
   * GET /api/forms/:schemaId
   */
  async getFormSchema(schemaId: string): Promise<FormSchema> {
    const response = await apiClient.get<ApiResponse<FormSchema>>(
      `/forms/${encodeURIComponent(schemaId)}`
    );
    return response.data.data;
  },

  /**
   * Retrieves a specific version of a form schema.
   * GET /api/forms/:schemaId/versions/:version
   */
  async getFormSchemaVersion(schemaId: string, version: number): Promise<FormSchema> {
    const response = await apiClient.get<ApiResponse<FormSchema>>(
      `/forms/${encodeURIComponent(schemaId)}/versions/${version}`
    );
    return response.data.data;
  },

  /**
   * Lists all available form schemas.
   * GET /api/forms
   */
  async getFormSchemas(): Promise<FormSchema[]> {
    const response = await apiClient.get<ApiResponse<FormSchema[]>>('/forms');
    return response.data.data;
  },

  /**
   * Retrieves all available version numbers for a schema.
   * GET /api/forms/:schemaId/versions
   */
  async getFormVersions(schemaId: string): Promise<number[]> {
    const response = await apiClient.get<ApiResponse<number[]>>(
      `/forms/${encodeURIComponent(schemaId)}/versions`
    );
    return response.data.data;
  },

  /**
   * Backward-compatible alias for getFormSchema
   */
  async getFormById(formId: string, version?: number): Promise<FormSchema> {
    if (version !== undefined) {
      return this.getFormSchemaVersion(formId, version);
    }
    return this.getFormSchema(formId);
  },

  /**
   * Backward-compatible alias for getFormSchemas
   */
  async getForms(): Promise<FormSchema[]> {
    return this.getFormSchemas();
  },

  /**
   * Form submission placeholder (future step)
   */
  async submitForm(payload: FormSubmissionPayload): Promise<{ success: boolean; id: string }> {
    const response = await apiClient.post<{ success: boolean; id: string }>('/submissions', payload);
    return response.data;
  },
};

export default formApi;
