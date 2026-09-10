import { useState, useEffect, useCallback, useRef } from 'react';
import { FormSchema } from '../types/form';
import { formApi } from '../services/formApi';
import { useFormStore } from '../stores/formStore';

export interface UseFormSchemaResult {
  schema: FormSchema | null;
  loading: boolean;
  isLoading: boolean; // Convenience alias
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * useFormSchema - Custom hook responsible for loading and caching a form schema
 *
 * @param schemaId The unique schema identifier (e.g. 'auto-insurance-claim')
 * @param version Optional specific version number
 */
export const useFormSchema = (
  schemaId: string,
  version?: number
): UseFormSchemaResult => {
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const setCurrentSchema = useFormStore((state) => state.setCurrentSchema);
  const isMountedRef = useRef<boolean>(true);

  const fetchSchema = useCallback(async () => {
    if (!schemaId) {
      setLoading(false);
      setError('Schema ID is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data =
        version !== undefined
          ? await formApi.getFormSchemaVersion(schemaId, version)
          : await formApi.getFormSchema(schemaId);

      if (isMountedRef.current) {
        setSchema(data);
        setCurrentSchema(data);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to fetch form schema';
        setError(errorMsg);
        setSchema(null);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [schemaId, version, setCurrentSchema]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSchema();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchSchema]);

  return {
    schema,
    loading,
    isLoading: loading,
    error,
    refetch: fetchSchema,
  };
};

export default useFormSchema;
