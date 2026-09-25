import { normalizeCodeLanguage } from '@/utils/code/codeHighlight';
import { isRecord } from '@/utils/type/typeGuards';

import type { NoteMarkdownBlockImport } from '../../registry/types';

/** 将标准 Mermaid fenced code block 归一化为 Note 的专属图表块。 */
export const mermaidMarkdownImport: NoteMarkdownBlockImport = {
  restore(block) {
    if (block.type !== 'codeBlock' || !isRecord(block.props)) return undefined;
    const language = block.props.language;
    if (typeof language !== 'string' || normalizeCodeLanguage(language) !== 'mermaid') {
      return undefined;
    }

    const { props: _props, ...base } = block;
    return { ...base, type: 'mermaid', props: {} };
  },
};
