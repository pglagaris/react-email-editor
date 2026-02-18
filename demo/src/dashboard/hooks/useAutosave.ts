import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutosaveOptions {
  /** The editor instance from Unlayer */
  editor: any;
  /** Callback to perform the actual save */
  onSave: (designJson: any) => Promise<void>;
  /** Debounce delay in ms (default: 3000) */
  delay?: number;
  /** Whether autosave is enabled */
  enabled?: boolean;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useAutosave({ editor, onSave, delay = 3000, enabled = true }: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingRef = useRef(false);

  const doSave = useCallback(() => {
    if (!editor || isSavingRef.current) {
      pendingRef.current = true;
      return;
    }

    isSavingRef.current = true;
    setStatus('saving');

    editor.saveDesign(async (design: any) => {
      try {
        await onSave(design);
        setStatus('saved');
        setLastSaved(new Date());
      } catch (err) {
        console.error('Autosave failed:', err);
        setStatus('error');
      } finally {
        isSavingRef.current = false;

        // If a change came in while we were saving, save again
        if (pendingRef.current) {
          pendingRef.current = false;
          doSave();
        }
      }
    });
  }, [editor, onSave]);

  const scheduleSave = useCallback(() => {
    if (!enabled) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      doSave();
    }, delay);
  }, [doSave, delay, enabled]);

  // Listen to design:updated event
  useEffect(() => {
    if (!editor || !enabled) return;

    const handler = () => {
      scheduleSave();
    };

    editor.addEventListener('design:updated', handler);

    return () => {
      editor.removeEventListener('design:updated', handler);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [editor, scheduleSave, enabled]);

  // Force save now (for manual save button)
  const saveNow = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    doSave();
  }, [doSave]);

  return { status, lastSaved, saveNow };
}
