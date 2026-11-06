import { useCallback, useEffect, useRef, useState } from 'react';
import { getAiAssistUsage } from '@/product/lib/csv';
import type { AiAssistUsage } from '@/types/models';

/** What a component needs to decide whether the AI remap can run, and to explain why not. */
export interface AiAssistAvailability {
  /** True when this deployment has an OpenRouter key configured. */
  enabled: boolean;
  /** Per-seat monthly allowance; `null` until it has been read at least once. */
  usage: AiAssistUsage | null;
  /** True once the allowance has been read, so a caller can avoid flashing "unavailable". */
  loaded: boolean;
  /** Re-reads the allowance. Never throws: an unreadable allowance must not block the manual flow. */
  refresh: () => Promise<void>;
  /** Keeps the counters an assist returned, so the UI chip is exact straight away. */
  recordUsage: (usage: AiAssistUsage | null | undefined) => void;
}

/**
 * Shared AI-mapping availability for the two places that offer it (upload and Step 2).
 *
 * Keeping the policy in one hook means both surfaces agree on what "usable" means, and a plan change
 * or an exhausted allowance is reflected identically wherever the fallback is offered.
 */
export function useAiAssist({ auto = true }: { auto?: boolean } = {}): AiAssistAvailability {
  const [enabled, setEnabled] = useState(false);
  const [usage, setUsage] = useState<AiAssistUsage | null>(null);
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await getAiAssistUsage();
      if (!mounted.current) return;
      setEnabled(Boolean(result.enabled));
      setUsage(result.usage ?? null);
    } catch {
      // Leave whatever we already knew in place: a failed read is not evidence the feature is off.
    } finally {
      if (mounted.current) setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (auto) void refresh();
  }, [auto, refresh]);

  const recordUsage = useCallback((next: AiAssistUsage | null | undefined) => {
    if (next) {
      setUsage(next);
      setLoaded(true);
    }
  }, []);

  return { enabled, usage, loaded, refresh, recordUsage };
}
