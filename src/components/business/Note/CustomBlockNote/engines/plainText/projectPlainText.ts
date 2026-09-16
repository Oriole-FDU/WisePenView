import { isRecord } from '@/utils/typeGuards';

import type { NotePluginRegistry } from '../../registry/types';

export function projectInlinePlainText(content: unknown, registry: NotePluginRegistry): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .filter(isRecord)
    .map((inline) => {
      const type = typeof inline.type === 'string' ? inline.type : '';
      return registry.inlinePlugins.get(type)?.plainText?.project(inline, registry) ?? '';
    })
    .join('');
}

export function projectBlockPlainText(block: unknown, registry: NotePluginRegistry): string {
  if (!isRecord(block)) return '';
  const type = typeof block.type === 'string' ? block.type : '';
  const owner = registry.blockPlugins.get(type);
  if (owner?.plainText) {
    return owner.plainText.project(block, registry);
  }
  return projectInlinePlainText(block.content, registry);
}
