import { useState, useCallback } from 'react';
import { aiApi } from '../services/aiApi';
import { ClaimExtractionResult } from '../types/ai';

export interface UseAiExtractionReturn {
  loading: boolean;
  error: string | null;
  result: ClaimExtractionResult | null;
  extract: (text: string, schemaId?: string) => Promise<ClaimExtractionResult | null>;
  reset: () => void;
}

/**
 * Custom React hook for orchestrating AI extraction requests.
 * Manages loading, error, and result states.
 */
export const useAiExtraction = (): UseAiExtractionReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimExtractionResult | null>(null);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  const extract = useCallback(
    async (text: string, schemaId?: string): Promise<ClaimExtractionResult | null> => {
      setLoading(true);
      setError(null);

      try {
        const extractedData = await aiApi.extractClaim(text, schemaId);
        setResult(extractedData);
        return extractedData;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'An unexpected error occurred during AI extraction.';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    result,
    extract,
    reset,
  };
};

export default useAiExtraction;
