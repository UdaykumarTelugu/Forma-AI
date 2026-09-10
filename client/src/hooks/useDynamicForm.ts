import { useState, useCallback } from 'react';
import { FormSchema, FormValues } from '../types/form';

/**
 * useDynamicForm - Hook managing dynamic form values, validation, and submission state
 */
export const useDynamicForm = (initialSchema?: FormSchema) => {
  // TODO: Integrate React Hook Form methods and dynamic field registration
  const [values, setValues] = useState<FormValues>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const setFieldValue = useCallback((field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setValues({});
  }, []);

  return {
    values,
    setFieldValue,
    resetForm,
    isSubmitting,
    setIsSubmitting,
    schema: initialSchema,
  };
};

export default useDynamicForm;
