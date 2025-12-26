/**
 * Form Persistence Utility
 *
 * Automatically saves form data to localStorage and restores it on component mount.
 * Useful for multi-step wizards and long forms to prevent data loss.
 */

export interface FormDraft<T = any> {
  data: T;
  savedAt: string;
  expiresAt: string;
}

export class FormPersistence<T extends Record<string, any>> {
  private key: string;
  private expirationHours: number;

  constructor(formId: string, expirationHours: number = 48) {
    this.key = `form_draft_${formId}`;
    this.expirationHours = expirationHours;
  }

  /**
   * Save form data to localStorage
   */
  save(data: Partial<T>): void {
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.expirationHours * 60 * 60 * 1000);

      const draft: FormDraft<Partial<T>> = {
        data,
        savedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      localStorage.setItem(this.key, JSON.stringify(draft));
    } catch (error) {
      console.warn('[FormPersistence] Failed to save draft:', error);
    }
  }

  /**
   * Load form data from localStorage
   */
  load(): Partial<T> | null {
    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) {
        return null;
      }

      const draft: FormDraft<Partial<T>> = JSON.parse(stored);

      // Check if draft has expired
      const expiresAt = new Date(draft.expiresAt);
      const now = new Date();

      if (now > expiresAt) {
        this.clear();
        return null;
      }

      return draft.data;
    } catch (error) {
      console.warn('[FormPersistence] Failed to load draft:', error);
      return null;
    }
  }

  /**
   * Get draft metadata (saved time, expiration time)
   */
  getDraftInfo(): { savedAt: Date; expiresAt: Date } | null {
    try {
      const stored = localStorage.getItem(this.key);
      if (!stored) {
        return null;
      }

      const draft: FormDraft = JSON.parse(stored);
      return {
        savedAt: new Date(draft.savedAt),
        expiresAt: new Date(draft.expiresAt),
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if a draft exists and hasn't expired
   */
  hasDraft(): boolean {
    const draft = this.load();
    return draft !== null;
  }

  /**
   * Clear saved draft
   */
  clear(): void {
    localStorage.removeItem(this.key);
  }

  /**
   * Get time remaining before expiration (in hours)
   */
  getTimeRemaining(): number | null {
    const info = this.getDraftInfo();
    if (!info) {
      return null;
    }

    const now = new Date();
    const remaining = info.expiresAt.getTime() - now.getTime();
    return remaining / (1000 * 60 * 60); // Convert to hours
  }
}

/**
 * React Hook for form persistence
 */
import { useState, useEffect, useCallback } from 'react';

export function useFormPersistence<T extends Record<string, any>>(
  formId: string,
  initialData: T,
  expirationHours: number = 48
) {
  const [persistence] = useState(() => new FormPersistence<T>(formId, expirationHours));
  const [formData, setFormData] = useState<T>(initialData);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: Date; expiresAt: Date } | null>(null);

  // Load draft on mount
  useEffect(() => {
    const draft = persistence.load();
    if (draft) {
      setFormData({ ...initialData, ...draft });
      setHasDraft(true);
      setDraftInfo(persistence.getDraftInfo());
    }
  }, []);

  // Auto-save on data change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData && Object.keys(formData).length > 0) {
        persistence.save(formData);
        setDraftInfo(persistence.getDraftInfo());
      }
    }, 1000); // Save 1 second after last change

    return () => clearTimeout(timeoutId);
  }, [formData, persistence]);

  const updateFormData = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData);
    persistence.clear();
    setHasDraft(false);
    setDraftInfo(null);
  }, [initialData, persistence]);

  const restoreDraft = useCallback(() => {
    const draft = persistence.load();
    if (draft) {
      setFormData({ ...initialData, ...draft });
      setHasDraft(true);
    }
  }, [initialData, persistence]);

  const discardDraft = useCallback(() => {
    persistence.clear();
    setFormData(initialData);
    setHasDraft(false);
    setDraftInfo(null);
  }, [initialData, persistence]);

  return {
    formData,
    updateFormData,
    resetForm,
    hasDraft,
    draftInfo,
    restoreDraft,
    discardDraft,
    setFormData,
  };
}

/**
 * Component to show draft restoration prompt
 */
export function DraftPrompt({
  draftInfo,
  onRestore,
  onDiscard,
}: {
  draftInfo: { savedAt: Date; expiresAt: Date };
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const savedTime = draftInfo.savedAt.toLocaleString();
  const hoursAgo = Math.floor((Date.now() - draftInfo.savedAt.getTime()) / (1000 * 60 * 60));
  const timeText = hoursAgo < 1 ? 'less than an hour ago' : `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">
            Continue where you left off?
          </h4>
          <p className="text-sm text-blue-700 mb-3">
            We found a saved draft from {timeText} ({savedTime}). Would you like to restore it?
          </p>
          <div className="flex gap-3">
            <button
              onClick={onRestore}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              Restore Draft
            </button>
            <button
              onClick={onDiscard}
              className="px-4 py-2 border border-blue-300 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
