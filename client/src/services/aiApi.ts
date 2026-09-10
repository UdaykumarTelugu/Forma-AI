import { apiClient } from './api';
import { ClaimExtractionResult, ExtractClaimResponse } from '../types/ai';

/**
 * AI Service API client for sending unstructured claim text to backend LLM extraction service.
 */
export const aiApi = {
  /**
   * Sends unstructured claim description to POST /api/ai/extract
   * and returns the validated structured extraction result.
   *
   * @param text Natural language description of the incident
   * @param schemaId Optional target form schema identifier
   * @returns Promise<ClaimExtractionResult>
   */
  extractClaim: async (text: string, schemaId?: string): Promise<ClaimExtractionResult> => {
    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error('Please enter a claim description to extract.');
    }

    const response = await apiClient.post<ExtractClaimResponse>('/ai/extract', {
      text: trimmed,
      schemaId: schemaId || undefined,
    });

    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }

    if (response.data && response.data.error?.message) {
      throw new Error(response.data.error.message);
    }

    throw new Error('No structured extraction data received from AI service.');
  },
};

export default aiApi;
