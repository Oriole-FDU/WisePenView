import {
  type BlockSpecs,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  type InlineContentConfig,
  type InlineContentSpec,
} from '@blocknote/core';
import { Image as ImageIcon } from 'lucide-react';

import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import { projectInlinePlainText } from '../../engines/plainText';
import { collectInlineTextMatches } from '../../engines/search/findReplace';
import type {
  NoteBlockPlugin,
  NoteCapabilityDeclaration,
  NoteContentCapabilityDeclarations,
  NoteInlinePlugin,
  NotePluginBundle,
  NotePrintContribution,
} from '../../registry/types';
import {
  createRichTextBlockAiDiff,
  linkInlineAiDiff,
  type NoteRichTextAiDiffConfig,
  textInlineAiDiff,
} from './aiDiff';

const DEFAULT_CAPABILITY: NoteCapabilityDeclaration = { support: 'default' };
const UNSUPPORTED_AI_DIFF: NoteCapabilityDeclaration = {
  support: 'unsupported',
  reason: '当前内容类型不承担 AI Diff 语义',
};
function richTextCapabilities(): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff: { support: 'inherited' },
    plainText: { support: 'inherited' },
    findReplace: { support: 'custom' },
    print: DEFAULT_CAPABILITY,
  };
}

function atomicCapabilities(): NoteContentCapabilityDeclarations {
  return {
    markdownImport: DEFAULT_CAPABILITY,
    markdownExport: DEFAULT_CAPABILITY,
    aiDiff: UNSUPPORTED_AI_DIFF,
    plainText: { support: 'inherited' },
    findReplace: { support: 'unsupported', reason: '媒体和分割线不包含可替换文本' },
    print: DEFAULT_CAPABILITY,
  };
}

function createDefaultBlockPlugin(
  type: string,
  capabilities: NoteContentCapabilityDeclarations,
  options: {
    outline?: NoteBlockPlugin['outline'];
    aiDiff?: NoteBlockPlugin['aiDiff'];
    contentModel?: NoteBlockPlugin['contentModel'];
    defaultInsertion?: boolean;
    inlineMathDollar?: boolean;
    print?: NotePrintContribution;
    sideMenu?: NoteBlockPlugin['sideMenu'];
  } = {}
) {
  const spec = (defaultBlockSpecs as BlockSpecs)[type];
  if (!spec) {
    throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
      reason: `BlockNote 默认 block spec 不存在：${type}`,
    });
  }
  return {
    kind: 'block',
    id: `default.block.${type}`,
    type,
    spec,
    contentModel: options.contentModel ?? 'inline',
    ...(options.defaultInsertion
      ? { insertion: { default: true, createEmpty: () => ({ type }) } }
      : {}),
    ...(options.inlineMathDollar ? { inputRules: { inlineMathDollar: true } } : {}),
    capabilities,
    selection: {
      inspect: (_block, context) => ({ selected: context.selected, text: context.selectedText }),
    },
    ...(options.aiDiff ? { aiDiff: options.aiDiff } : {}),
    ...(options.print ? { print: options.print } : {}),
    ...(options.sideMenu ? { sideMenu: options.sideMenu } : {}),
    ...(options.outline ? { outline: options.outline } : {}),
    ...(capabilities.findReplace.support === 'custom'
      ? {
          findReplace: {
            collectMatches: ({ node, pos, query }) =>
              collectInlineTextMatches(node, pos, query, `default.block.${type}`),
          },
        }
      : {}),
    plainText: {
      project: (block, registry) => projectInlinePlainText(block.content, registry),
    },
  } satisfies NoteBlockPlugin;
}

function createDefaultInlinePlugin(type: 'text' | 'link') {
  const spec = defaultInlineContentSpecs[type] as InlineContentSpec<InlineContentConfig>;
  return {
    kind: 'inline',
    id: `default.inline.${type}`,
    type,
    spec,
    capabilities: {
      markdownImport: DEFAULT_CAPABILITY,
      markdownExport: DEFAULT_CAPABILITY,
      aiDiff: { support: 'inherited' },
      plainText: { support: 'inherited' },
      findReplace: { support: 'unsupported', reason: '文本由所属 block 统一处理' },
      print: DEFAULT_CAPABILITY,
    },
    selection: {
      inspect: (_inline, context) => ({ selected: context.selected, text: context.selectedText }),
    },
    plainText: {
      project: (inline, registry) => {
        if (type === 'text') {
          return typeof inline.text === 'string' ? inline.text : '';
        }
        return projectInlinePlainText(inline.content, registry);
      },
    },
    aiDiff: type === 'text' ? textInlineAiDiff : linkInlineAiDiff,
  } satisfies NoteInlinePlugin;
}

const richTextBlockTypes = [
  'paragraph',
  'heading',
  'quote',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'toggleListItem',
] as const;

const passThroughAtomicBlockTypes = ['audio', 'divider', 'file', 'image', 'video'] as const;

const headingOutline: NonNullable<NoteBlockPlugin['outline']> = {
  getLevel: (block) => {
    const props =
      typeof block.props === 'object' && block.props !== null
        ? (block.props as Record<string, unknown>)
        : {};
    const level = Number(props.level ?? 1);
    return Number.isFinite(level) && level > 0 ? level : 1;
  },
};

const headingPrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='heading'],
.note-print-title .bn-block-content[data-content-type='heading'] {
  break-after: avoid-page;
  page-break-after: avoid;
}`,
  ],
};

const quotePrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='quote'] {
  break-after: avoid-page;
  page-break-after: avoid;
}`,
  ],
};

const atomicMediaPrint: NotePrintContribution = {
  styles: [
    `.note-print-body .bn-block-content[data-content-type='image'],
.note-print-body .bn-block-content[data-content-type='video'],
.note-print-body .bn-block-content[data-content-type='audio'] {
  break-inside: avoid-page;
  page-break-inside: avoid;
}`,
  ],
};

export function createDefaultContentPlugin(
  aiDiffConfig: NoteRichTextAiDiffConfig
): NotePluginBundle {
  const richTextBlockAiDiff = createRichTextBlockAiDiff(aiDiffConfig);
  return {
    kind: 'bundle',
    id: 'default-content',
    children: [
      createDefaultInlinePlugin('text'),
      createDefaultInlinePlugin('link'),
      ...richTextBlockTypes.map((type) =>
        createDefaultBlockPlugin(
          type,
          {
            ...richTextCapabilities(),
            ...(type === 'heading' || type === 'quote'
              ? { print: { support: 'custom' as const } }
              : {}),
          },
          {
            ...(type === 'heading' ? { outline: headingOutline } : {}),
            aiDiff: richTextBlockAiDiff,
            defaultInsertion: type === 'paragraph',
            inlineMathDollar:
              type === 'paragraph' ||
              type === 'bulletListItem' ||
              type === 'numberedListItem' ||
              type === 'checkListItem',
            ...(type === 'heading' ? { print: headingPrint } : {}),
            ...(type === 'quote' ? { print: quotePrint } : {}),
            ...(type === 'heading'
              ? {
                  sideMenu: {
                    inspect(block: Record<string, unknown>) {
                      const props =
                        typeof block.props === 'object' && block.props !== null
                          ? (block.props as Record<string, unknown>)
                          : {};
                      return { attributes: { level: String(props.level ?? 1) } };
                    },
                  },
                }
              : {}),
          }
        )
      ),
      ...passThroughAtomicBlockTypes.map((type) =>
        createDefaultBlockPlugin(
          type,
          {
            ...atomicCapabilities(),
            ...(type === 'audio' || type === 'image' || type === 'video'
              ? { print: { support: 'custom' as const } }
              : {}),
          },
          {
            contentModel: 'none',
            ...(type === 'audio' || type === 'image' || type === 'video'
              ? { print: atomicMediaPrint }
              : {}),
            ...(type === 'image' ? { sideMenu: { icon: ImageIcon } } : {}),
          }
        )
      ),
    ],
  };
}
