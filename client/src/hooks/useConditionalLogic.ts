import { useMemo } from 'react';
import { useWatch, Control, FieldValues } from 'react-hook-form';
import { ConditionalRule, FormValues } from '../types/form';
import { evaluateConditions } from '../utils/conditionalLogic';

export interface UseConditionalLogicOptions {
  control?: Control<FieldValues>;
  values?: FormValues;
}

/**
 * useConditionalLogic - Hook evaluating whether a field or section should be visible.
 *
 * Observes active form values in real time via React Hook Form's `useWatch()`,
 * and evaluates declarative conditional rules using the pure `evaluateConditions` engine.
 *
 * Architecture Flow:
 * React Hook Form -> useWatch(values) -> evaluateConditions() -> isVisible (boolean)
 */
export const useConditionalLogic = (
  conditions?: ConditionalRule[] | ConditionalRule,
  optionsOrValues?: UseConditionalLogicOptions | FormValues
): boolean => {
  const options: UseConditionalLogicOptions =
    optionsOrValues && ('control' in optionsOrValues || 'values' in optionsOrValues)
      ? (optionsOrValues as UseConditionalLogicOptions)
      : { values: optionsOrValues as FormValues | undefined };

  const watchedValues = useWatch({
    control: options.control,
  }) as FormValues | undefined;

  return useMemo(() => {
    if (!conditions) return true;
    const activeValues: FormValues = options.values || watchedValues || {};
    return evaluateConditions(conditions, activeValues);
  }, [conditions, watchedValues, options.values]);
};

export default useConditionalLogic;
