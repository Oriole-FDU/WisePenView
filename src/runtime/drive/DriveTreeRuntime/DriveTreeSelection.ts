import type { DriveNode } from '@/domains/Drive';

import type { DriveTreeNodeStore } from './DriveTreeNodeStore';
import type { DriveTreeRequest, DriveTreeSelectOptions, DriveTreeSnapshot } from './index.type';

type DriveTreeSelectionSnapshot = Pick<DriveTreeSnapshot, 'selectedKeys' | 'checkedKeys'>;

export class DriveTreeSelection {
  private readonly request: DriveTreeRequest;
  private readonly store: DriveTreeNodeStore;
  private selectedKeys = new Set<string>();
  private checkedKeys = new Set<string>();
  private initialSelectionPending = true;

  constructor(request: DriveTreeRequest, store: DriveTreeNodeStore) {
    this.request = request;
    this.store = store;
  }

  setNode(nodeKey: string | null): void {
    this.selectedKeys = nodeKey ? new Set([nodeKey]) : new Set();
  }

  setChecked(nodeKeys: Iterable<string>): void {
    this.checkedKeys = new Set(nodeKeys);
  }

  clearChecked(): boolean {
    if (this.checkedKeys.size === 0) return false;
    this.checkedKeys = new Set();
    return true;
  }

  select(options: DriveTreeSelectOptions): DriveNode[] {
    this.initialSelectionPending = false;
    const normalized = this.normalizeSelectableKeys(
      [...options.keys],
      options.isNodeSelectable,
      options.isNodeDisabled
    );
    const nextKeys = this.request.multiple
      ? normalized
      : (() => {
          const rawKeys = options.clickedSelected
            ? normalized
            : options.clickedKey
              ? [options.clickedKey]
              : normalized;
          const nextNormalized = this.normalizeSelectableKeys(
            rawKeys,
            options.isNodeSelectable,
            options.isNodeDisabled
          );
          return nextNormalized[0] ? [nextNormalized[0]] : [];
        })();
    this.selectedKeys = new Set(nextKeys);
    return this.getSelectedNodes();
  }

  applyInitialSelection(): void {
    if (!this.initialSelectionPending) return;
    const initialIds = new Set(this.request.initialSelectedIds ?? []);
    if (initialIds.size === 0) {
      this.initialSelectionPending = false;
      return;
    }
    const matchedKeys = this.normalizeSelectableKeys(
      [...this.store.listNodes()]
        .filter(([, node]) =>
          node.type === 'resource' || node.type === 'link'
            ? initialIds.has(node.resourceId) || initialIds.has(node.id)
            : initialIds.has(node.id)
        )
        .map(([nodeKey]) => nodeKey)
    );
    if (matchedKeys.length === 0) return;
    this.selectedKeys = new Set(
      this.request.multiple
        ? [...this.selectedKeys, ...matchedKeys]
        : this.selectedKeys.size > 0
          ? this.selectedKeys
          : [matchedKeys[0]!]
    );
  }

  reset(): void {
    this.selectedKeys = new Set();
    this.checkedKeys = new Set();
    this.initialSelectionPending = true;
  }

  buildSnapshot(): DriveTreeSelectionSnapshot {
    return {
      selectedKeys: new Set(this.selectedKeys),
      checkedKeys: new Set(this.checkedKeys),
    };
  }

  private normalizeSelectableKeys(
    keys: readonly string[],
    isNodeSelectable?: (node: DriveNode) => boolean,
    isNodeDisabled?: (node: DriveNode) => boolean
  ): string[] {
    const disabledIds = new Set(this.request.disabledNodeIds ?? []);
    const selectableTypes = new Set(
      this.request.selectableTypes ?? ['root', 'folder', 'resource', 'link']
    );
    return keys
      .map((key) => this.resolveInputKey(key))
      .filter((key): key is string => {
        if (!key) return false;
        const node = this.store.getNode(key);
        return Boolean(
          node &&
          selectableTypes.has(node.type) &&
          !disabledIds.has(node.id) &&
          isNodeDisabled?.(node) !== true &&
          (isNodeSelectable?.(node) ?? true)
        );
      });
  }

  private resolveInputKey(key: string): string | undefined {
    if (this.store.getNode(key)) return key;
    for (const [nodeKey, node] of this.store.listNodes()) {
      if (node.id === key) return nodeKey;
      if ((node.type === 'resource' || node.type === 'link') && node.resourceId === key) {
        return nodeKey;
      }
    }
    return undefined;
  }

  private getSelectedNodes(): DriveNode[] {
    return [...this.selectedKeys]
      .map((key) => this.store.getNode(key))
      .filter((node): node is DriveNode => Boolean(node));
  }
}
