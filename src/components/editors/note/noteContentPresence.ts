import { isRecord } from '@/utils/type/typeGuards';

/** 历史版本可能已在不同语言下写入的默认标题。 */
const NOTE_TITLE_PLACEHOLDERS = ['未命名笔记', 'Untitled note'] as const;

function normalizeNoteTitle(title: string | undefined): string {
  return title?.replace(/[\s\u200b-\u200d\ufeff]+/g, ' ').trim() ?? '';
}

function hasVisibleText(value: string): boolean {
  return value.replace(/[\s\u200b-\u200d\ufeff]/g, '').length > 0;
}

function readBlockProps(block: Record<string, unknown>): Record<string, unknown> {
  return isRecord(block.props) ? block.props : {};
}

function hasSubstantiveInlineContent(content: unknown): boolean {
  if (typeof content === 'string') return hasVisibleText(content);
  if (!Array.isArray(content)) return false;

  return content.some((value) => {
    if (!isRecord(value)) return false;
    const type = typeof value.type === 'string' ? value.type : '';
    const text = typeof value.text === 'string' ? value.text : '';

    if (type === 'text') return hasVisibleText(text);
    if (type === 'link') {
      return (
        hasSubstantiveInlineContent(value.content) ||
        (typeof value.href === 'string' && hasVisibleText(value.href))
      );
    }
    if (type === 'inlineMath') {
      const expression = readBlockProps(value).expression;
      return typeof expression === 'string' && hasVisibleText(expression);
    }
    if (hasSubstantiveInlineContent(value.content)) return true;

    // 未知行内内容类型按非空处理。
    return type.length > 0;
  });
}

/** 标题为空、纯空白或仅包含未命名占位文案时视为空标题。 */
export function isNoteTitleEmpty(title: string | undefined, untitledTitle: string): boolean {
  const normalizedTitle = normalizeNoteTitle(title);
  if (!normalizedTitle) return true;

  const placeholders = new Set<string>(NOTE_TITLE_PLACEHOLDERS);
  const normalizedUntitled = normalizeNoteTitle(untitledTitle);
  if (normalizedUntitled) placeholders.add(normalizedUntitled);
  return placeholders.has(normalizedTitle);
}

function isEmptyParagraphBlock(block: unknown): block is Record<string, unknown> {
  if (!isRecord(block) || block.type !== 'paragraph') return false;
  if (Array.isArray(block.children) && block.children.length > 0) return false;
  return !hasSubstantiveInlineContent(block.content);
}

/**
 * trailingBlock 会在用户开始输入后自动追加一个空 paragraph。
 * 它属于编辑器占位结构，不应把已删除全部文字的正文继续判定为非空。
 */
export function isNoteBodyEmpty(blocks: unknown): boolean {
  if (!Array.isArray(blocks) || blocks.length === 0) return false;

  const userBlocks =
    blocks.length > 1 && isEmptyParagraphBlock(blocks.at(-1)) ? blocks.slice(0, -1) : blocks;
  return userBlocks.length === 1 && isEmptyParagraphBlock(userBlocks[0]);
}
