/**
 * 助手 Markdown 输出中的原文引用协议。
 *
 * 形如 `wisepen://note/<noteId>#p_<blockId>`：只有严格符合该形态的地址才走点击分发，
 * 其余自定义协议（例如后续可能出现的 `wisepen://skill/...`）一律回落 Markdown 默认处理。
 */
export const NOTE_LINK_SCHEME = 'wisepen:';
export const NOTE_LINK_HOST = 'note';
/** 块锚点命名空间前缀，与 AI 输出协议约定一致 */
export const NOTE_BLOCK_ANCHOR_PREFIX = 'p_';

export interface NoteLinkTarget {
  resourceId: string;
  blockId: string;
}

/** 点击原文链接时的目标动作：当前已打开同一笔记时只滚动，否则先打开再滚动。 */
export type NoteLinkAction = 'scroll' | 'open';

function decodeSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded ? decoded : null;
  } catch {
    return null;
  }
}

/** 解析原文链接；无法严格解析时返回 null，由调用方回落到默认链接渲染。 */
export function parseNoteLinkUrl(url: string): NoteLinkTarget | null {
  const rawUrl = url.trim();
  if (!rawUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== NOTE_LINK_SCHEME) return null;
  // 非特殊协议的 host 不会被 URL 规范化大小写，这里显式忽略大小写
  if (parsed.hostname.toLowerCase() !== NOTE_LINK_HOST) return null;
  if (parsed.username || parsed.password || parsed.port) return null;

  const segments = parsed.pathname
    .split('/')
    .filter((segment, index) => index > 0 || segment !== '');
  if (segments.length !== 1) return null;

  const resourceId = decodeSegment(segments[0] ?? '');
  if (!resourceId) return null;

  const anchor = parsed.hash.startsWith('#') ? parsed.hash.slice(1) : '';
  if (!anchor.startsWith(NOTE_BLOCK_ANCHOR_PREFIX)) return null;

  const blockId = decodeSegment(anchor.slice(NOTE_BLOCK_ANCHOR_PREFIX.length));
  if (!blockId) return null;

  return { resourceId, blockId };
}

/** 生成原文链接，供 mock 数据与测试复用。 */
export function buildNoteLinkUrl({ resourceId, blockId }: NoteLinkTarget): string {
  const encodedResourceId = encodeURIComponent(resourceId.trim());
  const encodedBlockId = encodeURIComponent(blockId.trim());
  return `${NOTE_LINK_SCHEME}//${NOTE_LINK_HOST}/${encodedResourceId}#${NOTE_BLOCK_ANCHOR_PREFIX}${encodedBlockId}`;
}

export function resolveNoteLinkAction(params: {
  currentNoteId?: string | null;
  targetNoteId: string;
}): NoteLinkAction {
  const currentNoteId = params.currentNoteId?.trim();
  return currentNoteId && currentNoteId === params.targetNoteId.trim() ? 'scroll' : 'open';
}
