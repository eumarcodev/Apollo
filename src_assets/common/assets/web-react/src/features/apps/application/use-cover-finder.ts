import { useCallback, useEffect, useRef, useState } from 'react';
import type { CoverCandidate } from '@/features/apps/domain/cover-finder';
import { AppError } from '@/shared/kernel';
import type { CoversPort } from './ports';

export type CoverFinderStatus = 'idle' | 'searching' | 'ready' | 'error';

export interface CoverFinder {
  isOpen: boolean;
  status: CoverFinderStatus;
  candidates: readonly CoverCandidate[];
  /** A cover is being downloaded by the host: the grid is locked. */
  busy: boolean;
  /** The download of the picked cover failed (message of the host). */
  pickError: string | null;
  open(name: string): void;
  close(): void;
  /** Download the cover through the host, hand its path to `onPath` and close; on failure stay open with `pickError`. */
  pick(candidate: CoverCandidate): Promise<void>;
}

/** State of the cover finder popup: search by app name, pick one, set the stored path. */
export function useCoverFinder(port: CoversPort, onPath: (path: string) => void): CoverFinder {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<CoverFinderStatus>('idle');
  const [candidates, setCandidates] = useState<readonly CoverCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const open = useCallback(
    (name: string) => {
      controller.current?.abort();
      const current = new AbortController();
      controller.current = current;
      setIsOpen(true);
      setStatus('searching');
      setCandidates([]);
      setPickError(null);
      port.search(name, current.signal).then(
        (found) => {
          if (!current.signal.aborted) {
            setCandidates(found);
            setStatus('ready');
          }
        },
        () => {
          if (!current.signal.aborted) {
            setStatus('error');
          }
        },
      );
    },
    [port],
  );

  const close = useCallback(() => {
    controller.current?.abort();
    setIsOpen(false);
  }, []);

  const pick = useCallback(
    async (candidate: CoverCandidate) => {
      setBusy(true);
      setPickError(null);
      try {
        onPath(await port.upload(candidate));
        close();
      } catch (cause) {
        setPickError(AppError.from(cause).message);
      } finally {
        setBusy(false);
      }
    },
    [port, onPath, close],
  );

  return { isOpen, status, candidates, busy, pickError, open, close, pick };
}
