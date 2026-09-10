import React from 'react';
import { useFormContext } from 'react-hook-form';
import { ConditionalRule, FormValues } from '../../types/form';
import { useConditionalLogic } from '../../hooks/useConditionalLogic';
import { evaluateConditions } from '../../utils/conditionalLogic';

export interface ConditionalFieldProps {
  conditions?: ConditionalRule[] | ConditionalRule;
  condition?: ConditionalRule;
  explicitValues?: FormValues;
  children: React.ReactNode;
}

/**
 * Inner component safely calling useConditionalLogic when inside FormProvider
 */
const WatchedConditionalField: React.FC<{
  rules: ConditionalRule[] | ConditionalRule;
  children: React.ReactNode;
}> = ({ rules, children }) => {
  const isVisible = useConditionalLogic(rules);
  if (!isVisible) return null;
  return <>{children}</>;
};

/**
 * ConditionalField - Wrapper that evaluates conditional logic to toggle field visibility
 */
export const ConditionalField: React.FC<ConditionalFieldProps> = ({
  conditions,
  condition,
  explicitValues,
  children,
}) => {
  const formContext = useFormContext();
  const rules = conditions || condition;

  if (!rules) {
    return <>{children}</>;
  }

  // If inside FormProvider, evaluate reactively via useWatch
  if (formContext) {
    return <WatchedConditionalField rules={rules}>{children}</WatchedConditionalField>;
  }

  // Fallback for isolated testing/rendering without FormProvider
  const isVisible = evaluateConditions(rules, explicitValues || {});
  if (!isVisible) return null;
  return <>{children}</>;
};

export default ConditionalField;
