import { useSyncExternalStore } from 'react';

export type TableRailSelectionOrientation = 'row' | 'column';

export type TableRailSelectionRect = {
  height: number;
  width: number;
  x: number;
  y: number;
};

type TableRailSelectionSnapshot = {
  blockId: string | null;
  endIndex: number | null;
  orientation: TableRailSelectionOrientation | null;
  rect: TableRailSelectionRect | null;
  startIndex: number | null;
};

const listeners = new Set<() => void>();
let snapshot: TableRailSelectionSnapshot = {
  blockId: null,
  endIndex: null,
  orientation: null,
  rect: null,
  startIndex: null,
};

const emit = () => {
  for (const listener of listeners) {
    listener();
  }
};

export const tableRailSelectionState = {
  clear() {
    if (snapshot.orientation === null) {
      return;
    }
    snapshot = {
      blockId: null,
      endIndex: null,
      orientation: null,
      rect: null,
      startIndex: null,
    };
    emit();
  },
  getSnapshot() {
    return snapshot;
  },
  setSelection(
    orientation: TableRailSelectionOrientation,
    rect: TableRailSelectionRect,
    range: { blockId: string; endIndex: number; startIndex: number }
  ) {
    if (
      snapshot.blockId === range.blockId &&
      snapshot.endIndex === range.endIndex &&
      snapshot.orientation === orientation &&
      snapshot.rect?.x === rect.x &&
      snapshot.rect.y === rect.y &&
      snapshot.rect.width === rect.width &&
      snapshot.rect.height === rect.height &&
      snapshot.startIndex === range.startIndex
    ) {
      return;
    }
    snapshot = { orientation, rect, ...range };
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useTableRailSelectionState() {
  return useSyncExternalStore(
    tableRailSelectionState.subscribe,
    tableRailSelectionState.getSnapshot,
    tableRailSelectionState.getSnapshot
  );
}
