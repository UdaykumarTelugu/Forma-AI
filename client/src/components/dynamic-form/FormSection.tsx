import React from 'react';
import { FormSection as FormSectionType, ConditionalRule } from '../../types/form';
import { ConditionalField } from './ConditionalField';

export interface FormSectionProps {
  section: FormSectionType & {
    conditions?: ConditionalRule[];
    conditional?: ConditionalRule;
  };
  children?: React.ReactNode;
}

/**
 * FormSection - Groups related fields visually and semantically with professional InsurTech SaaS styling.
 * Automatically supports conditional section-level activation and smooth animated transitions.
 */
export const FormSection: React.FC<FormSectionProps> = ({ section, children }) => {
  const sectionConditions =
    section.conditions && section.conditions.length > 0
      ? section.conditions
      : section.conditional
      ? [section.conditional]
      : undefined;

  const content = (
    <fieldset className="form-section" id={`section-${section.id}`}>
      <div className="section-header">
        <legend className="section-title">
          <span className="section-title-dot" aria-hidden="true" />
          <span>{section.title}</span>
        </legend>
        {section.description && <p className="section-description">{section.description}</p>}
      </div>
      <div className="section-fields">{children}</div>
    </fieldset>
  );

  if (sectionConditions && sectionConditions.length > 0) {
    return <ConditionalField conditions={sectionConditions}>{content}</ConditionalField>;
  }

  return content;
};

export default FormSection;
