// eslint-disable-next-line no-restricted-imports -- Note 待重构：暂时允许 useEffect
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Block } from '@/types/note';
import type { NoteProps } from './index.type';
import NoteTitle from './NoteTitle';
import NoteContent from './NoteContent';
import type { NoteContentRef } from './NoteContent/index.type';
import styles from './style.module.less';

/** 将 ISO 时间字符串格式化为「最近编辑」展示文案 */
function formatLastEditedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const Note: React.FC<NoteProps> = ({
  pipeline,
  initialBlocks,
  lastEditedAt,
  isNewlyCreated,
  onTitleStable,
  onRegisterGetSnapshot,
}) => {
  const contentRef = useRef<NoteContentRef>(null);
  const titleRef = useRef<string | undefined>(undefined);

  const { headingBlock, contentBlocks } = useMemo(() => {
    const blocks = initialBlocks ?? [];
    const rest = blocks.slice(1);
    return {
      headingBlock: blocks[0] as Block | undefined,
      contentBlocks: rest.length > 0 ? rest : undefined,
    };
  }, [initialBlocks]);

  const handleTitleStable = useCallback(
    (title: string) => {
      titleRef.current = title;
      onTitleStable?.(title);
    },
    [onTitleStable]
  );

  const focusContent = useCallback(() => {
    contentRef.current?.focus();
  }, []);

  const getSnapshot = useCallback(async () => {
    const blocks = contentRef.current?.getBlocks() ?? [];
    return {
      blocks,
      title: titleRef.current,
    };
  }, []);

  useEffect(() => {
    if (!onRegisterGetSnapshot) return;
    onRegisterGetSnapshot(getSnapshot);
  }, [getSnapshot, onRegisterGetSnapshot]);

  const metaLabel = isNewlyCreated
    ? '新创建'
    : lastEditedAt
      ? `最近编辑：${formatLastEditedAt(lastEditedAt)}`
      : null;

  return (
    <div className={styles.noteWrapper}>
      <NoteTitle
        initialBlock={headingBlock}
        onEnterKey={focusContent}
        focusOnMount={isNewlyCreated}
        onTitleStable={handleTitleStable}
      />
      {metaLabel && <p className={styles.lastEditedAt}>{metaLabel}</p>}
      <NoteContent ref={contentRef} pipeline={pipeline} initialBlocks={contentBlocks} />
    </div>
  );
};

export default Note;
export { NoteTitle, NoteContent };
