import { create } from 'zustand';

/**
 * Visual/operational status of a form field regarding AI extraction.
 */
export type FieldAiStatus = 'none' | 'ai-applied' | 'user-reviewed';

/**
 * Forma AI — AI Suggestion Metadata Store
 *
 * CRITICAL ARCHITECTURE RULE:
 * This store tracks ONLY suggestion metadata (which fields were populated by AI and
 * whether the user has edited them).
 * It does NOT duplicate or manage actual form values (which are owned solely by React Hook Form).
 */
export interface AiSuggestionState {
  /**
   * Map of fieldName -> initial value suggested by AI.
   * A field is considered an active AI suggestion only while present here
   * and absent from userModifiedFields.
   */
  aiSuggestedFields: Record<string, unknown>;

  /**
   * Set of fieldNames that the user has manually edited or reviewed.
   * Once a field is marked as user-modified, incoming repeated extractions
   * will NOT overwrite it by default.
   */
  userModifiedFields: Record<string, boolean>;

  /**
   * Set of fieldNames that were originally populated by AI and subsequently
   * reviewed/edited by the user.
   */
  userReviewedFields: Record<string, boolean>;

  /**
   * Sets newly applied AI suggestions into metadata tracking.
   */
  setAiSuggestions: (suggestions: Record<string, unknown>) => void;

  /**
   * Marks a field as edited/reviewed by the user.
   * If the field was an AI suggestion, moves it to userReviewedFields.
   */
  markFieldEdited: (fieldName: string) => void;

  /**
   * Clears all AI suggestion and reviewed markers across the form.
   * Does NOT modify actual form values in React Hook Form.
   */
  clearAiMarkers: () => void;

  /**
   * Resets all metadata (e.g. on full form reset).
   */
  reset: () => void;

  /**
   * Explicitly confirms an AI suggestion without modifying its value.
   * Transitions field to userReviewedFields and marks as user-modified
   * so subsequent extractions do not overwrite it.
   */
  confirmAiSuggestion: (fieldName: string) => void;

  /**
   * Confirms all currently active AI suggestions across the form.
   */
  confirmAllAiSuggestions: () => void;

  /**
   * Returns a list of field names that are currently active unreviewed AI suggestions.
   */
  getUnreviewedAiFields: () => string[];

  /**
   * Evaluates the active status of a given field ('none' | 'ai-applied' | 'user-reviewed').
   */
  getFieldStatus: (fieldName: string, currentValue?: unknown) => FieldAiStatus;

  /**
   * Evaluates whether a given field is currently an active, unedited AI suggestion.
   * (Backward compatibility helper)
   */
  isFieldAiSuggested: (fieldName: string, currentValue?: unknown) => boolean;
}

export const useAiSuggestionStore = create<AiSuggestionState>((set, get) => ({
  aiSuggestedFields: {},
  userModifiedFields: {},
  userReviewedFields: {},

  setAiSuggestions: (suggestions: Record<string, unknown>) => {
    set((state) => ({
      aiSuggestedFields: {
        ...state.aiSuggestedFields,
        ...suggestions,
      },
    }));
  },

  markFieldEdited: (fieldName: string) => {
    set((state) => {
      const wasAiSuggested = fieldName in state.aiSuggestedFields;
      const nextSuggested = { ...state.aiSuggestedFields };
      delete nextSuggested[fieldName];

      return {
        aiSuggestedFields: nextSuggested,
        userModifiedFields: {
          ...state.userModifiedFields,
          [fieldName]: true,
        },
        userReviewedFields: wasAiSuggested
          ? { ...state.userReviewedFields, [fieldName]: true }
          : state.userReviewedFields,
      };
    });
  },

  clearAiMarkers: () => {
    set({
      aiSuggestedFields: {},
      userReviewedFields: {},
    });
  },

  reset: () => {
    set({
      aiSuggestedFields: {},
      userModifiedFields: {},
      userReviewedFields: {},
    });
  },

  confirmAiSuggestion: (fieldName: string) => {
    set((state) => {
      const nextSuggested = { ...state.aiSuggestedFields };
      delete nextSuggested[fieldName];

      return {
        aiSuggestedFields: nextSuggested,
        userModifiedFields: {
          ...state.userModifiedFields,
          [fieldName]: true,
        },
        userReviewedFields: {
          ...state.userReviewedFields,
          [fieldName]: true,
        },
      };
    });
  },

  confirmAllAiSuggestions: () => {
    set((state) => {
      const activeKeys = Object.keys(state.aiSuggestedFields);
      const nextModified = { ...state.userModifiedFields };
      const nextReviewed = { ...state.userReviewedFields };

      for (const key of activeKeys) {
        nextModified[key] = true;
        nextReviewed[key] = true;
      }

      return {
        aiSuggestedFields: {},
        userModifiedFields: nextModified,
        userReviewedFields: nextReviewed,
      };
    });
  },

  getUnreviewedAiFields: (): string[] => {
    const { aiSuggestedFields, userReviewedFields, userModifiedFields } = get();
    return Object.keys(aiSuggestedFields).filter(
      (f) => !userReviewedFields[f] && !userModifiedFields[f]
    );
  },

  getFieldStatus: (fieldName: string, currentValue?: unknown): FieldAiStatus => {
    const { aiSuggestedFields, userModifiedFields, userReviewedFields } = get();

    if (userReviewedFields[fieldName]) {
      return 'user-reviewed';
    }

    if (userModifiedFields[fieldName]) {
      return 'none';
    }

    if (fieldName in aiSuggestedFields) {
      if (currentValue !== undefined) {
        const initialAiValue = aiSuggestedFields[fieldName];
        if (String(currentValue) !== String(initialAiValue)) {
          return 'user-reviewed';
        }
      }
      return 'ai-applied';
    }

    return 'none';
  },

  isFieldAiSuggested: (fieldName: string, currentValue?: unknown): boolean => {
    return get().getFieldStatus(fieldName, currentValue) === 'ai-applied';
  },
}));

export default useAiSuggestionStore;
