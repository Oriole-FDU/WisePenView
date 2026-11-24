import type { DriveTreeSnapshot } from './index.type';

type DriveTreeInteractionSnapshot = Pick<
  DriveTreeSnapshot,
  'draggingKeys' | 'activeDragKey' | 'detailPanelCollapsed'
>;

export class DriveTreeInteractionState {
  private draggingKeys = new Set<string>();
  private activeDragKey: string | null = null;
  private detailPanelCollapsed = true;

  get dragKeys(): ReadonlySet<string> {
    return this.draggingKeys;
  }

  get activeKey(): string | null {
    return this.activeDragKey;
  }

  setDetailPanelCollapsed(collapsed: boolean): boolean {
    if (this.detailPanelCollapsed === collapsed) return false;
    this.detailPanelCollapsed = collapsed;
    return true;
  }

  beginDrag(nodeKeys: Iterable<string>, activeNodeKey: string): void {
    this.draggingKeys = new Set(nodeKeys);
    this.activeDragKey = activeNodeKey;
  }

  endDrag(): boolean {
    if (this.draggingKeys.size === 0 && this.activeDragKey === null) return false;
    this.draggingKeys = new Set();
    this.activeDragKey = null;
    return true;
  }

  reset(): void {
    this.draggingKeys = new Set();
    this.activeDragKey = null;
  }

  buildSnapshot(): DriveTreeInteractionSnapshot {
    return {
      draggingKeys: new Set(this.draggingKeys),
      activeDragKey: this.activeDragKey,
      detailPanelCollapsed: this.detailPanelCollapsed,
    };
  }
}
