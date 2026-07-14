import { useEffect, useRef } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => void | Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 3000,
  enabled = true,
}: UseAutoSaveOptions<T>) {
  const debouncedData = useDebounce(data, debounceMs);
  const isFirstRender = useRef(true);
  const lastSavedData = useRef<T | null>(null);

  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastSavedData.current = debouncedData;
      return;
    }

    // Skip if auto-save is disabled
    if (!enabled) return;

    // Skip if data hasn't changed
    if (JSON.stringify(debouncedData) === JSON.stringify(lastSavedData.current)) {
      return;
    }

    // Save data
    const save = async () => {
      try {
        await onSave(debouncedData);
        lastSavedData.current = debouncedData;
      } catch (error) {
        console.error('[useAutoSave] Failed to auto-save:', error);
      }
    };

    save();
  }, [debouncedData, enabled, onSave]);
}
