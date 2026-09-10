import React from 'react';
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form';
import { FormSchema, FormValues } from '../../types/form';
import { FormSection } from './FormSection';
import { FieldRenderer } from './FieldRenderer';

export interface DynamicFormProps {
  schema?: FormSchema;
  defaultValues?: FormValues;
  form?: UseFormReturn<FormValues>;
  onSubmit?: (data: FormValues) => Promise<void> | void;
  onSaveDraft?: () => Promise<void> | void;
  isSavingDraft?: boolean;
  saveDraftDisabled?: boolean;
  reviewSummaryNode?: React.ReactNode;
}

/**
 * DynamicForm - Master coordinator for schema-driven form rendering
 *
 * Architecture Flow:
 * FormSchema -> DynamicForm (FormProvider) -> FormSection -> FieldRenderer -> Specific Field Components
 * React Hook Form -> useWatch(values) -> evaluateConditions() -> conditional visibility
 */
export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  defaultValues,
  form: externalForm,
  onSubmit,
  onSaveDraft,
  isSavingDraft = false,
  saveDraftDisabled = false,
  reviewSummaryNode,
}) => {
  const internalForm = useForm<FormValues>({
    mode: 'onChange',
    defaultValues: defaultValues || {},
    shouldUnregister: true,
  });

  const methods = externalForm || internalForm;
  const isSubmitting = methods.formState.isSubmitting;

  if (!schema) {
    return <div className="dynamic-form-empty">No form schema provided.</div>;
  }

  const hasSections = Array.isArray(schema.sections) && schema.sections.length > 0;
  const hasFields = Array.isArray(schema.fields) && schema.fields.length > 0;

  const onFormSubmit = methods.handleSubmit(async (data) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  });

  return (
    <FormProvider {...methods}>
      <form className="dynamic-form" onSubmit={onFormSubmit} noValidate>
        <header className="dynamic-form-header">
          <h2 className="dynamic-form-title">{schema.title}</h2>
          {schema.description && (
            <p className="dynamic-form-description">{schema.description}</p>
          )}
        </header>

        <div className="dynamic-form-content">
          {hasSections ? (
            schema.sections!.map((section) => (
              <FormSection key={section.id} section={section}>
                {section.fields?.map((field) => (
                  <FieldRenderer key={field.id} field={field} />
                ))}
              </FormSection>
            ))
          ) : hasFields ? (
            <div className="dynamic-form-flat-fields">
              {schema.fields!.map((field) => (
                <FieldRenderer key={field.id} field={field} />
              ))}
            </div>
          ) : (
            <p className="dynamic-form-empty-notice">This form schema contains no fields.</p>
          )}
        </div>

        {reviewSummaryNode}

        <div className="dynamic-form-actions">
          {onSaveDraft && (
            <button
              type="button"
              className="btn btn-secondary save-draft-btn"
              onClick={onSaveDraft}
              disabled={isSubmitting || isSavingDraft || saveDraftDisabled}
              aria-busy={isSavingDraft}
            >
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary submit-btn"
            disabled={isSubmitting || isSavingDraft}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? 'Submitting Claim...' : 'Submit Claim'}
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export default DynamicForm;
