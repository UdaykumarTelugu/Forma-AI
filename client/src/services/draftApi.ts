import {
  FormDraft,
  FormValues,
  DraftSaveResult,
  DraftGetResult,
  DraftListResult,
  DraftDeleteResult,
  DraftCompatibilityResult,
} from '../types/form';

const STORAGE_INDEX_KEY = 'forma_ai_draft_index';
const DRAFT_KEY_PREFIX = 'forma_ai_draft_';

// In-memory fallback map for non-browser environments (Node tests / SSR)
// or when localStorage is blocked/unavailable.
let inMemoryStore: Record<string, string> = {};

const getStorageItem = (key: string): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Access denied or quota error � fall through to in-memory store
  }
  return inMemoryStore[key] ?? null;
};

const setStorageItem = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Fall through to in-memory store
  }
  inMemoryStore[key] = value;
};

const removeStorageItem = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
  } catch {
    // Fall through
  }
  delete inMemoryStore[key];
};

const getDraftIndex = (): string[] => {
  const raw = getStorageItem(STORAGE_INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveDraftIndex = (index: string[]): void => {
  const unique = Array.from(new Set(index));
  setStorageItem(STORAGE_INDEX_KEY, JSON.stringify(unique));
};

/**
 * Generates a stable, unique draft identifier.
 */
export const generateDraftId = (): string => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `draft_${timestamp}_${randomSuffix}`;
};

/**
 * Checks compatibility between a draft and the active form schema.
 */
export const checkDraftCompatibility = (
  draft: FormDraft,
  currentSchemaId: string,
  currentVersion: number
): DraftCompatibilityResult => {
  if (draft.schemaId !== currentSchemaId) {
    return {
      compatible: false,
      status: 'incompatible',
      message: `Draft belongs to schema "${draft.schemaId}", but current form is "${currentSchemaId}".`,
    };
  }

  const draftVer = typeof draft.schemaVersion === 'number'
    ? draft.schemaVersion
    : parseInt(String(draft.schemaVersion), 10);

  if (draftVer !== currentVersion) {
    return {
      compatible: true,
      status: 'version_mismatch',
      message: `Draft was saved with schema v${draft.schemaVersion}, but current form is v${currentVersion}. Values have been restored, but please review all fields.`,
    };
  }

  return {
    compatible: true,
    status: 'exact',
  };
};

export interface SaveDraftInput {
  draftId?: string;
  schemaId: string;
  schemaVersion: number | string;
  values: FormValues;
}

/**
 * Forma AI � Draft Persistence Service Abstraction
 *
 * Provides a production-grade boundary between form UI and draft storage:
 * - draftApi.saveDraft(...)
 * - draftApi.getDraft(...)
 * - draftApi.listDrafts(...)
 * - draftApi.deleteDraft(...)
 */
export const draftApi = {
  /**
   * Saves a form draft.
   * If draftId is provided and exists, updates the draft values and updatedAt
   * while strictly preserving createdAt, schemaId, and schemaVersion.
   * If draftId is new or omitted, generates a stable draftId and sets createdAt.
   */
  async saveDraft(input: SaveDraftInput): Promise<DraftSaveResult> {
    try {
      if (!input.schemaId) {
        return { success: false, error: 'Schema ID is required to save a draft.' };
      }
      if (!input.values || typeof input.values !== 'object') {
        return { success: false, error: 'Valid form values are required to save a draft.' };
      }

      const normalizedVersion = typeof input.schemaVersion === 'number'
        ? input.schemaVersion
        : parseInt(String(input.schemaVersion), 10) || 1;

      const now = new Date().toISOString();
      let draftId = input.draftId?.trim();
      let createdAt = now;

      // Check if updating an existing draft
      if (draftId) {
        const existingRaw = getStorageItem(`${DRAFT_KEY_PREFIX}${draftId}`);
        if (existingRaw) {
          try {
            const existing = JSON.parse(existingRaw) as FormDraft;
            if (existing.createdAt) {
              createdAt = existing.createdAt;
            }
          } catch {
            // Corrupt existing draft � will be overwritten with preserved/new createdAt
          }
        }
      } else {
        draftId = generateDraftId();
      }

      const draft: FormDraft = {
        draftId,
        schemaId: input.schemaId,
        schemaVersion: normalizedVersion,
        values: input.values,
        createdAt,
        updatedAt: now,
      };

      // Persist draft payload
      setStorageItem(`${DRAFT_KEY_PREFIX}${draftId}`, JSON.stringify(draft));

      // Update index
      const index = getDraftIndex();
      if (!index.includes(draftId)) {
        index.push(draftId);
        saveDraftIndex(index);
      }

      return {
        success: true,
        draft,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft.';
      return { success: false, error: msg };
    }
  },

  /**
   * Retrieves a draft by draftId.
   * Safely handles missing or corrupted drafts without throwing.
   */
  async getDraft(draftId: string): Promise<DraftGetResult> {
    try {
      if (!draftId) {
        return { success: false, error: 'Draft ID is required.' };
      }

      const raw = getStorageItem(`${DRAFT_KEY_PREFIX}${draftId}`);
      if (!raw) {
        return { success: false, error: `Draft "${draftId}" not found.` };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { success: false, error: 'Corrupted draft data: invalid JSON format.' };
      }

      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Corrupted draft data: payload is not an object.' };
      }

      const draft = parsed as Partial<FormDraft>;
      if (!draft.draftId || !draft.schemaId || !draft.values) {
        return { success: false, error: 'Malformed draft data: missing required draft fields.' };
      }

      const normalizedDraft: FormDraft = {
        draftId: String(draft.draftId),
        schemaId: String(draft.schemaId),
        schemaVersion: typeof draft.schemaVersion === 'number'
          ? draft.schemaVersion
          : parseInt(String(draft.schemaVersion || 1), 10) || 1,
        values: draft.values as FormValues,
        createdAt: draft.createdAt || new Date().toISOString(),
        updatedAt: draft.updatedAt || new Date().toISOString(),
      };

      return {
        success: true,
        draft: normalizedDraft,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve draft.';
      return { success: false, error: msg };
    }
  },

  /**
   * Lists all available drafts, optionally filtered by schemaId.
   * Corrupted drafts are safely skipped without failing the entire list.
   * Returned drafts are sorted with the most recently updated first.
   */
  async listDrafts(schemaId?: string): Promise<DraftListResult> {
    try {
      const index = getDraftIndex();
      const drafts: FormDraft[] = [];

      for (const id of index) {
        const result = await this.getDraft(id);
        if (result.success && result.draft) {
          if (!schemaId || result.draft.schemaId === schemaId) {
            drafts.push(result.draft);
          }
        }
      }

      // Sort newest first
      drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      return {
        success: true,
        drafts,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to list drafts.';
      return { success: false, drafts: [], error: msg };
    }
  },

  /**
   * Deletes a draft by draftId and removes it from the index.
   */
  async deleteDraft(draftId: string): Promise<DraftDeleteResult> {
    try {
      if (!draftId) {
        return { success: false, error: 'Draft ID is required to delete.' };
      }

      removeStorageItem(`${DRAFT_KEY_PREFIX}${draftId}`);

      const index = getDraftIndex().filter((id) => id !== draftId);
      saveDraftIndex(index);

      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete draft.';
      return { success: false, error: msg };
    }
  },

  /**
   * Internal helper to reset all draft storage (for testing isolation).
   */
  _clearAllDrafts(): void {
    const index = getDraftIndex();
    for (const id of index) {
      removeStorageItem(`${DRAFT_KEY_PREFIX}${id}`);
    }
    removeStorageItem(STORAGE_INDEX_KEY);
    inMemoryStore = {};
  },
};

export default draftApi;
