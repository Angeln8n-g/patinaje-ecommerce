import { useCallback, useRef, useState } from 'react';
import type { ContentProperties, StyleProperties } from '@/lib/email-templates/types';

export interface HistorySnapshot {
  contentProperties: ContentProperties;
  styleProperties: StyleProperties;
  htmlContent: string;
}

export interface UseHistoryStack {
  push: (snapshot: HistorySnapshot) => void;
  undo: () => HistorySnapshot | null;
  redo: () => HistorySnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
}

export function useHistoryStack(): UseHistoryStack {
  const pastRef = useRef<HistorySnapshot[]>([]);
  const futureRef = useRef<HistorySnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const push = useCallback((snapshot: HistorySnapshot) => {
    pastRef.current = [...pastRef.current, snapshot];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback((): HistorySnapshot | null => {
    const past = pastRef.current;
    if (past.length === 0) return null;

    const previous = past[past.length - 1];
    pastRef.current = past.slice(0, -1);
    futureRef.current = [previous, ...futureRef.current];

    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    return previous;
  }, []);

  const redo = useCallback((): HistorySnapshot | null => {
    const future = futureRef.current;
    if (future.length === 0) return null;

    const next = future[0];
    futureRef.current = future.slice(1);
    pastRef.current = [...pastRef.current, next];

    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    return next;
  }, []);

  return { push, undo, redo, canUndo, canRedo };
}
