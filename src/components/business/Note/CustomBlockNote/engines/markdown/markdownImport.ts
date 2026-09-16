import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { isRecord } from '@/utils/typeGuards';

import type {
  NoteMarkdownImportContext,
  NoteMarkdownImportSegment,
  NotePluginRegistry,
} from '../../registry/types';

interface StoredToken {
  ownerId: string;
  value: string;
}

function createTokenContexts(markdown: string) {
  let prefix = 'WISENOTEMARKDOWNTOKEN';
  while (markdown.includes(prefix)) {
    prefix += 'X';
  }

  let tokenIndex = 0;
  const tokens = new Map<string, StoredToken>();
  const tokenPattern = () => new RegExp(`${prefix}\\d+X`, 'g');

  const contexts = new Map<string, NoteMarkdownImportContext>();
  const getContext = (ownerId: string): NoteMarkdownImportContext => {
    const current = contexts.get(ownerId);
    if (current) return current;

    const context: NoteMarkdownImportContext = {
      createToken(value) {
        const token = `${prefix}${tokenIndex++}X`;
        tokens.set(token, { ownerId, value });
        return token;
      },
      readExactToken(text) {
        const stored = tokens.get(text.trim());
        return stored?.ownerId === ownerId ? stored.value : undefined;
      },
      splitTokens(text) {
        const segments: NoteMarkdownImportSegment[] = [];
        let offset = 0;
        for (const match of text.matchAll(tokenPattern())) {
          const token = match[0];
          const index = match.index;
          const stored = tokens.get(token);
          if (stored?.ownerId !== ownerId) continue;
          if (index > offset) {
            segments.push({ type: 'text', text: text.slice(offset, index) });
          }
          segments.push({ type: 'token', value: stored.value });
          offset = index + token.length;
        }
        if (offset === 0) return [{ type: 'text', text }];
        if (offset < text.length) {
          segments.push({ type: 'text', text: text.slice(offset) });
        }
        return segments;
      },
    };
    contexts.set(ownerId, context);
    return context;
  };

  return getContext;
}

function normalizeInlineContent(
  content: unknown,
  registry: NotePluginRegistry,
  getContext: (ownerId: string) => NoteMarkdownImportContext
): unknown {
  if (!Array.isArray(content)) return content;

  return content.flatMap((value) => {
    if (!isRecord(value)) return [value];

    let candidates: readonly Record<string, unknown>[] = [value];
    for (const plugin of registry.contentPlugins) {
      if (plugin.kind !== 'inline') continue;
      const codec = plugin.markdownImport;
      if (!codec) continue;
      candidates = candidates.flatMap((candidate) => {
        const restored = codec.restore(candidate, getContext(plugin.id));
        return restored ?? [candidate];
      });
    }

    return candidates.map((candidate) => {
      const type = typeof candidate.type === 'string' ? candidate.type : '';
      if (!registry.inlinePlugins.has(type)) {
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_MARKDOWN_IMPORT_INVALID, {
          reason: `Markdown 导入生成了未注册 inline type：${type || 'unknown'}`,
        });
      }
      return Array.isArray(candidate.content)
        ? {
            ...candidate,
            content: normalizeInlineContent(candidate.content, registry, getContext),
          }
        : candidate;
    });
  });
}

function normalizeBlock(
  value: unknown,
  registry: NotePluginRegistry,
  getContext: (ownerId: string) => NoteMarkdownImportContext
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_MARKDOWN_IMPORT_INVALID, {
      reason: 'Markdown 导入生成了无效 block',
    });
  }

  let block: Record<string, unknown> = {
    ...value,
    ...(value.content !== undefined
      ? { content: normalizeInlineContent(value.content, registry, getContext) }
      : {}),
    ...(Array.isArray(value.children)
      ? { children: value.children.map((child) => normalizeBlock(child, registry, getContext)) }
      : {}),
  };

  for (const plugin of registry.contentPlugins) {
    if (plugin.kind !== 'block') continue;
    const codec = plugin.markdownImport;
    if (!codec) continue;
    block = codec.restore(block, getContext(plugin.id)) ?? block;
  }

  const type = typeof block.type === 'string' ? block.type : '';
  if (!registry.blockPlugins.has(type)) {
    throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_MARKDOWN_IMPORT_INVALID, {
      reason: `Markdown 导入生成了未注册 block type：${type || 'unknown'}`,
    });
  }
  return block;
}

export function importNoteMarkdown<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
>(
  editor: BlockNoteEditor<BSchema, I, S>,
  registry: NotePluginRegistry,
  markdown: string
): ReturnType<BlockNoteEditor<BSchema, I, S>['tryParseMarkdownToBlocks']> {
  const getContext = createTokenContexts(markdown);
  let preparedMarkdown = markdown;

  for (const plugin of registry.contentPlugins) {
    const codec = plugin.markdownImport;
    if (codec?.prepare) {
      preparedMarkdown = codec.prepare(preparedMarkdown, getContext(plugin.id));
    }
  }

  const blocks = editor.tryParseMarkdownToBlocks(preparedMarkdown);
  return blocks.map((block) => normalizeBlock(block, registry, getContext)) as ReturnType<
    BlockNoteEditor<BSchema, I, S>['tryParseMarkdownToBlocks']
  >;
}
