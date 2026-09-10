import React, { useState } from 'react';
import { useAiExtraction } from '../../hooks/useAiExtraction';
import { ClaimExtractionResult } from '../../types/ai';

export interface MagicInputProps {
  onExtractSuccess?: (result: ClaimExtractionResult) => void;
  disabled?: boolean;
  schemaId?: string;
}

const SAMPLE_PROMPTS = [
  'I hit a deer on I-95 yesterday in my Honda and the windshield shattered.',
  'A truck rear-ended my 2021 Ford F-150 at a red light, damaging the tailgate and bumper.',
  'Hail storm yesterday dented the entire roof and hood of my Toyota Camry.',
];

/**
 * MagicInput Component - Natural language prompt box powered by AI extraction.
 *
 * Allows users to describe an incident naturally and automatically populate
 * candidate values across dynamic form fields.
 */
export const MagicInput: React.FC<MagicInputProps> = ({
  onExtractSuccess,
  disabled = false,
  schemaId,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [lastExtractedCount, setLastExtractedCount] = useState<number | null>(null);
  const { loading, error, extract, reset } = useAiExtraction();

  const handleExtract = async () => {
    if (!inputText.trim() || loading || disabled) return;

    setLastExtractedCount(null);
    const result = await extract(inputText, schemaId);
    if (result) {
      const fieldCount = Object.keys(result).filter(
        (key) => (result as Record<string, unknown>)[key] !== undefined && (result as Record<string, unknown>)[key] !== ''
      ).length;
      setLastExtractedCount(fieldCount);

      if (onExtractSuccess) {
        onExtractSuccess(result);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter triggers extraction
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleExtract();
    }
  };

  const handleClear = () => {
    setInputText('');
    setLastExtractedCount(null);
    reset();
  };

  const handleUsePrompt = (prompt: string) => {
    setInputText(prompt);
    setLastExtractedCount(null);
    reset();
  };

  return (
    <div className="magic-input-card">
      <div className="magic-input-header">
        <div className="magic-input-title-area">
          <span className="magic-input-badge">AI Assistant</span>
          <h3 className="magic-input-heading">Magic Claim Autofill</h3>
        </div>
        <p className="magic-input-subtitle">
          Describe the incident in plain English. Our AI will extract relevant facts and pre-fill the form.
          You can review and edit every field afterwards.
        </p>
      </div>

      <div className="magic-input-body">
        <textarea
          className="magic-input-textarea"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. I hit a deer on I-95 yesterday in my Honda and the windshield shattered..."
          disabled={loading || disabled}
          aria-label="Claim description for AI extraction"
        />

        <div className="magic-input-samples">
          <span className="magic-input-samples-label">Try an example:</span>
          <div className="magic-input-chips">
            {SAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                className="magic-input-chip"
                onClick={() => handleUsePrompt(prompt)}
                disabled={loading || disabled}
              >
                &ldquo;{prompt.length > 45 ? `${prompt.slice(0, 45)}...` : prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="magic-input-error" role="alert">
            <span className="error-icon">&#9888;</span>
            <div className="error-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '1rem' }}>
              <div>
                <strong>Extraction Error:</strong> {error}
              </div>
              <button
                type="button"
                className="magic-input-retry-btn"
                onClick={handleExtract}
                disabled={loading || disabled || !inputText.trim()}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {lastExtractedCount !== null && lastExtractedCount > 0 && !error && (
          <div className="magic-input-success" role="status">
            <span className="success-icon">&#10004;</span>
            <div>
              <strong>Autofill Applied:</strong> Extracted {lastExtractedCount} field{lastExtractedCount === 1 ? '' : 's'} from your description. Review the populated fields below.
            </div>
          </div>
        )}
      </div>

      <div className="magic-input-footer">
        <span className="magic-input-hint">Tip: Press Ctrl+Enter to submit</span>
        <div className="magic-input-actions">
          {inputText && (
            <button
              type="button"
              className="btn btn-secondary magic-input-clear-btn"
              onClick={handleClear}
              disabled={loading || disabled}
            >
              Clear
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary magic-input-extract-btn"
            onClick={handleExtract}
            disabled={loading || disabled || !inputText.trim()}
          >
            {loading ? (
              <>
                <span className="magic-spinner" aria-hidden="true" />
                <span>Extracting claim information...</span>
              </>
            ) : (
              <>
                <span>&#10024; Autofill Form with AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MagicInput;
