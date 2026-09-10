import React from 'react';
import { FormSection as FormSectionType } from '../../types/form';

export interface FormSectionProps {
  section: FormSectionType;
  children?: React.ReactNode;
}

/**
 * FormSection - Groups related fields visually and semantically
 */
export const FormSection: React.FC<FormSectionProps> = ({ section, children }) => {
  return (
    <fieldset className="form-section" id={`section-${section.id}`}>
      <legend className="section-title">{section.title}</legend>
      {section.description && <p className="section-description">{section.description}</p>}
      <div className="section-fields">{children}</div>
    </fieldset>
  );
};

export default FormSection;
