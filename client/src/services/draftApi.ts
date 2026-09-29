import {
  FormDraft,
  FormValues,
  DraftSaveResult,
  DraftGetResult,
  DraftListResult,
  DraftDeleteResult,
  DraftCompatibilityResult,
  ApiResponse,
} from '../types/form';
import { apiClient } from './api';

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
    // Access denied or quota error — fall through to in-memory store
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

export const isValidMongoId = (id?: string): boolean => {
  return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id.trim());
};

export interface BackendDoc {
  _id?: string;
  formId?: string;
  formVersion?: number;
  data?: Record<string, unknown>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapDocToDraft = (doc: BackendDoc): FormDraft => ({
  draftId: String(doc._id || ''),
  schemaId: String(doc.formId || ''),
  schemaVersion: Number(doc.formVersion || 1),
  values: (doc.data || {}) as FormValues,
  createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
});

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
 * Forma AI — Draft Persistence Service Abstraction (Week 4 Step 1)
 *
 * Provides a backend-integrated boundary between form UI and draft storage:
 * - draftApi.saveDraft(...)  -> PATCH /api/submissions/:id or POST /api/submissions
 * - draftApi.getDraft(...)   -> GET /api/submissions/:id
 * - draftApi.listDrafts(...) -> GET /api/submissions?status=draft
 * - draftApi.deleteDraft(...) -> DELETE /api/submissions/:id
 *
 * Automatically falls back to local storage if the backend is unreachable.
 */
export const draftApi = {
  /**
   * Saves a form draft.
   * If draftId is a valid MongoDB ID, updates the document on the backend (PATCH /api/submissions/:id).
   * If draftId is omitted, creates a new draft on the backend (POST /api/submissions).
   * In all cases, caches in local storage for instant offline availability.
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

      const trimmedDraftId = input.draftId?.trim();
      let draft: FormDraft | null = null;

      // 1. If valid MongoDB ID provided, attempt to update existing draft on backend (PATCH /api/submissions/:id)
      if (isValidMongoId(trimmedDraftId)) {
        try {
          const res = await apiClient.patch<ApiResponse<BackendDoc>>(
            `/submissions/${trimmedDraftId}`,
            { data: input.values }
          );
          if (res.data?.success && res.data.data) {
            draft = mapDocToDraft(res.data.data);
          }
        } catch (apiErr: unknown) {
          const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          // If the backend actively rejected with 400 (e.g. claim already submitted), fail immediately
          if (errMsg.includes('already been submitted') || errMsg.includes('Only drafts')) {
            return { success: false, error: errMsg };
          }
          // Otherwise network issue — proceed to fallback below
        }
      } else if (!trimmedDraftId) {
        // 2. If no draftId provided, create a new draft on backend (POST /api/submissions)
        try {
          const res = await apiClient.post<ApiResponse<BackendDoc>>(
            '/submissions',
            {
              formId: input.schemaId,
              formVersion: normalizedVersion,
              data: input.values,
              status: 'draft',
            }
          );
          if (res.data?.success && res.data.data) {
            draft = mapDocToDraft(res.data.data);
          }
        } catch {
          // If creation fails due to server down, proceed to local fallback
        }
      }

      // 3. Fallback to local storage if backend call did not succeed
      if (!draft) {
        const now = new Date().toISOString();
        let fallbackDraftId = trimmedDraftId;
        let createdAt = now;

        if (fallbackDraftId) {
          const existingRaw = getStorageItem(`${DRAFT_KEY_PREFIX}${fallbackDraftId}`);
          if (existingRaw) {
            try {
              const existing = JSON.parse(existingRaw) as FormDraft;
              if (existing.createdAt) createdAt = existing.createdAt;
            } catch {
              // Corrupt existing draft
            }
          }
        } else {
          fallbackDraftId = generateDraftId();
        }

        draft = {
          draftId: fallbackDraftId,
          schemaId: input.schemaId,
          schemaVersion: normalizedVersion,
          values: input.values,
          createdAt,
          updatedAt: now,
        };
      }

      // Persist to local storage and index for offline backup / instant UI responsiveness
      setStorageItem(`${DRAFT_KEY_PREFIX}${draft.draftId}`, JSON.stringify(draft));
      const index = getDraftIndex();
      if (!index.includes(draft.draftId)) {
        index.push(draft.draftId);
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
   * If draftId is a valid MongoDB ID, attempts retrieval from backend first.
   * Falls back to local storage if backend is unreachable or record is purely local.
   */
  async getDraft(draftId: string): Promise<DraftGetResult> {
    try {
      if (!draftId) {
        return { success: false, error: 'Draft ID is required.' };
      }

      const trimmedId = draftId.trim();

      // 1. If valid MongoDB ID, try fetching from backend
      if (isValidMongoId(trimmedId)) {
        try {
          const res = await apiClient.get<ApiResponse<BackendDoc>>(`/submissions/${trimmedId}`);
          if (res.data?.success && res.data.data) {
            const draft = mapDocToDraft(res.data.data);
            setStorageItem(`${DRAFT_KEY_PREFIX}${draft.draftId}`, JSON.stringify(draft));
            return {
              success: true,
              draft,
            };
          }
        } catch {
          // Fall back to local store
        }
      }

      // 2. Fetch from local store
      const raw = getStorageItem(`${DRAFT_KEY_PREFIX}${trimmedId}`);
      if (!raw) {
        return { success: false, error: `Draft "${trimmedId}" not found.` };
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
   * Lists all drafts (status: draft), optionally filtered by schemaId.
   * Synchronizes drafts from backend MongoDB API with local cache.
   * Returned drafts are sorted newest-first.
   */
  async listDrafts(schemaId?: string): Promise<DraftListResult> {
    try {
      // 1. Attempt fetching drafts from backend
      try {
        const queryParams = new URLSearchParams();
        queryParams.set('status', 'draft');
        if (schemaId) queryParams.set('formId', schemaId);

        const res = await apiClient.get<ApiResponse<BackendDoc[]>>(
          `/submissions?${queryParams.toString()}`
        );

        if (res.data?.success && Array.isArray(res.data.data)) {
          const serverDrafts: FormDraft[] = res.data.data
            .filter((doc) => doc.status === 'draft')
            .filter((doc) => !schemaId || doc.formId === schemaId)
            .map(mapDocToDraft);

          // Update local cache and index with server drafts
          const serverDraftIds = serverDrafts.map((d) => d.draftId);
          for (const d of serverDrafts) {
            setStorageItem(`${DRAFT_KEY_PREFIX}${d.draftId}`, JSON.stringify(d));
          }
          const localIndex = getDraftIndex();
          saveDraftIndex([...localIndex, ...serverDraftIds]);

          // Also check for any purely local drafts not on server
          const localDrafts: FormDraft[] = [];
          for (const id of localIndex) {
            if (!serverDraftIds.includes(id)) {
              const localRes = await this.getDraft(id);
              if (localRes.success && localRes.draft) {
                if (!schemaId || localRes.draft.schemaId === schemaId) {
                  localDrafts.push(localRes.draft);
                }
              }
            }
          }

          const combined = [...serverDrafts, ...localDrafts];
          combined.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

          return {
            success: true,
            drafts: combined,
          };
        }
      } catch {
        // Fall back to local store
      }

      // 2. Fallback to purely local store
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
   * Deletes a draft by draftId and removes it from local store/index.
   * If draftId is a valid MongoDB ID, also deletes the draft from MongoDB.
   */
  async deleteDraft(draftId: string): Promise<DraftDeleteResult> {
    try {
      if (!draftId) {
        return { success: false, error: 'Draft ID is required to delete.' };
      }

      const trimmedId = draftId.trim();

      // 1. Remove from local store and index
      removeStorageItem(`${DRAFT_KEY_PREFIX}${trimmedId}`);
      const index = getDraftIndex().filter((id) => id !== trimmedId);
      saveDraftIndex(index);

      // 2. If it is a backend MongoDB ID, attempt deletion from server
      if (isValidMongoId(trimmedId)) {
        try {
          await apiClient.delete(`/submissions/${trimmedId}`);
        } catch {
          // If server reports 404 or cannot delete submitted doc, local cleanup succeeded
        }
      }

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
