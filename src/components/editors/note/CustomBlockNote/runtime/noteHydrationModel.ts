/** 只有尚未编辑的协作占位段落才需要初始化，连接时不能覆盖已输入的正文。 */
export function shouldPersistInitialEmptyBlock(
  blocks: readonly { id: string; type: string; content?: unknown; children?: readonly unknown[] }[]
): boolean {
  const block = blocks[0];
  return (
    blocks.length === 1 &&
    block.id === 'initialBlockId' &&
    block.type === 'paragraph' &&
    Array.isArray(block.content) &&
    block.content.length === 0 &&
    !block.children?.length
  );
}
