import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import type { NotePluginRegistry } from '../../registry/types';
import { projectBlockPlainText } from '../plainText';
import type { NoteOutlineItem } from './index.type';

export interface NoteOutlineBlockSnapshot {
  id: string;
  contributesToOutline: boolean;
}

export interface NoteOutlineProjection {
  items: NoteOutlineItem[];
  blocks: NoteOutlineBlockSnapshot[];
}

export interface NoteOutlineBlockProjection {
  snapshot: NoteOutlineBlockSnapshot;
  item?: NoteOutlineItem;
}

function toBlockRecord(block: unknown): Record<string, unknown> {
  return typeof block === 'object' && block !== null ? (block as Record<string, unknown>) : {};
}

export function projectNoteOutlineBlock(
  block: unknown,
  registry: NotePluginRegistry
): NoteOutlineBlockProjection | null {
  const record = toBlockRecord(block);
  const id = typeof record.id === 'string' ? record.id : '';
  if (!id) return null;
  const type = typeof record.type === 'string' ? record.type : '';
  const owner = registry.blockPlugins.get(type);
  const level = owner?.outline?.getLevel(record);
  return {
    snapshot: { id, contributesToOutline: level !== undefined },
    ...(level === undefined
      ? {}
      : {
          item: {
            id,
            level,
            text: projectBlockPlainText(block, registry).replace(/\s+/g, ' ').trim(),
          },
        }),
  };
}

export function buildNoteOutlineProjection<
  BSchema extends BlockSchema,
  ISchema extends InlineContentSchema,
  SSchema extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, ISchema, SSchema>,
  registry: NotePluginRegistry
): NoteOutlineProjection {
  const items: NoteOutlineItem[] = [];
  const blocks: NoteOutlineBlockSnapshot[] = [];
  editor.forEachBlock((block) => {
    const projection = projectNoteOutlineBlock(block, registry);
    if (!projection) return true;
    blocks.push(projection.snapshot);
    if (projection.item) items.push(projection.item);
    return true;
  });
  return { items, blocks };
}

export function resolveActiveOutlineItemId(
  blocks: readonly NoteOutlineBlockSnapshot[],
  currentBlockId: string
): string | undefined {
  const index = blocks.findIndex((block) => block.id === currentBlockId);
  if (index < 0) return undefined;
  for (let currentIndex = index; currentIndex >= 0; currentIndex -= 1) {
    if (blocks[currentIndex]?.contributesToOutline) return blocks[currentIndex]?.id;
  }
  return undefined;
}
