import type { ThreadData } from '@blocknote/core/comments';
import { CommentsExtension } from '@blocknote/core/comments';
import { Thread, useExtension } from '@blocknote/react';
import { Tooltip } from '@heroui/react';
import { RotateCcw } from 'lucide-react';
import React from 'react';

import styles from '../commentStyles.module.less';

export const CustomThreadItem = React.memo(
  ({
    thread,
    selectedThreadId,
    referenceText,
    maxCommentsBeforeCollapse,
    actionMode = 'default',
    canReopen = false,
  }: {
    thread: ThreadData;
    selectedThreadId?: string;
    referenceText: string;
    maxCommentsBeforeCollapse?: number;
    actionMode?: 'default' | 'history';
    canReopen?: boolean;
  }) => {
    const comments = useExtension(CommentsExtension);
    const isHistoryMode = actionMode === 'history';

    const onFocus = (event: React.FocusEvent) => {
      if ((event.target as HTMLElement).closest('.bn-action-toolbar')) {
        return;
      }
      comments.selectThread(thread.id);
    };

    return (
      <div
        className={isHistoryMode ? styles.historyThreadItem : undefined}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest(
              '.bn-action-toolbar, .bn-menu-dropdown, .mantine-Menu-dropdown, .mantine-Popover-dropdown'
            )
          ) {
            return;
          }
          comments.selectThread(thread.id);
        }}
      >
        <Thread
          thread={thread}
          selected={thread.id === selectedThreadId}
          referenceText={referenceText}
          maxCommentsBeforeCollapse={maxCommentsBeforeCollapse}
          onFocus={onFocus}
        />
        {isHistoryMode && thread.resolved && canReopen ? (
          <div className={styles.historyThreadReopenWrap}>
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger>
                <span className={styles.historyThreadReopenTrigger}>
                  <button
                    type="button"
                    className={styles.historyThreadReopenButton}
                    aria-label="重新打开"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      void comments.threadStore.unresolveThread({ threadId: thread.id });
                    }}
                  >
                    <RotateCcw size={14} />
                  </button>
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content>重新打开</Tooltip.Content>
            </Tooltip>
          </div>
        ) : null}
      </div>
    );
  }
);

CustomThreadItem.displayName = 'CustomThreadItem';
