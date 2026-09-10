import { create } from 'zustand';
import { FormSchema } from '../types/form';

/**
 * Global application store for active form schema metadata.
 * Note: Individual form field input values and validation errors
 * will be managed by React Hook Form in later steps.
 */
export interface FormStoreState {
  currentSchema: FormSchema | null;
  activeSchemaId: string | null;
  isLoading: boolean;
  error: string | null;
  setCurrentSchema: (schema: FormSchema | null) => void;
  setActiveSchemaId: (schemaId: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useFormStore = create<FormStoreState>((set) => ({
  currentSchema: null,
  activeSchemaId: null,
  isLoading: false,
  error: null,
  setCurrentSchema: (schema) =>
    set({
      currentSchema: schema,
      activeSchemaId: schema ? schema.schemaId || schema.id || null : null,
      error: null,
    }),
  setActiveSchemaId: (schemaId) => set({ activeSchemaId: schemaId }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () =>
    set({
      currentSchema: null,
      activeSchemaId: null,
      isLoading: false,
      error: null,
    }),
}));

export default useFormStore;
