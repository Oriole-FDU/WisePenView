import * as Y from 'yjs';

/** 同一空白页共享创建请求，创建成功后重试保存也复用资源，避免重复笔记。 */
export function createNoteDraftSession() {
  const doc = new Y.Doc();
  let resourceId: string | undefined;
  let pending: Promise<string> | undefined;
  return {
    doc,
    ensureResource(create: () => Promise<string>) {
      if (resourceId) return Promise.resolve(resourceId);
      if (!pending) {
        pending = create()
          .then((id) => {
            resourceId = id;
            return id;
          })
          .finally(() => {
            pending = undefined;
          });
      }
      return pending;
    },
  };
}

interface DraftBlock {
  type: string;
  content?: unknown;
  children?: readonly DraftBlock[];
}

/** 忽略默认空段落和空白文字，结构块及内联非文本内容属于实际编辑。 */
export function hasNoteDraftContent(blocks: readonly DraftBlock[]): boolean {
  return blocks.some((block) => {
    if (block.type !== 'paragraph') return true;
    if (block.children && hasNoteDraftContent(block.children)) return true;
    if (!Array.isArray(block.content)) return false;
    return block.content.some((item: { type?: string; text?: string; content?: unknown }) => {
      if (item.type === 'text') return Boolean(item.text?.trim());
      if (item.type === 'link')
        return hasNoteDraftContent([{ type: 'paragraph', content: item.content }]);
      return true;
    });
  });
}
