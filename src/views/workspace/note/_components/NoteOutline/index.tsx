import clsx from 'clsx';
import { ChevronsLeft, Menu } from 'lucide-react';

import AppIconButton from '@/components/Button/AppIconButton';
import type { NoteOutlineItem } from '@/components/Note/CustomBlockNote/index.type';
import styles from './style.module.less';

export const NOTE_OUTLINE_TITLE_ID = '__note_title__';

interface NoteOutlineProps {
  items: NoteOutlineItem[];
  activeId?: string;
  onNavigate: (id: string) => void;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function resolveLevelClass(level: number): string {
  const l = Math.min(6, Math.max(0, Math.floor(level)));
  return styles[`level${l}`];
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function NoteOutline({ items, activeId, onNavigate, title, open, onOpenChange }: NoteOutlineProps) {
  const displayItems = [{ id: NOTE_OUTLINE_TITLE_ID, level: 0, text: title }, ...items];

  if (!open) {
    return (
      <div className={styles.collapsedPanel}>
        <div className={styles.collapsedContent} aria-label="展开目录">
          <AppIconButton
            icon={<Menu size={20} aria-hidden="true" />}
            label="展开目录"
            className={styles.toggleButton}
            onClick={() => onOpenChange(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <aside className={styles.aside} aria-label="文档目录侧栏">
        <div className={styles.header}>
          <span className={styles.title}>目录</span>
          <AppIconButton
            icon={<ChevronsLeft size={20} aria-hidden="true" />}
            label="收起目录"
            className={styles.toggleButton}
            onClick={() => onOpenChange(false)}
          />
        </div>
        <div className={styles.scrollArea}>
          <div className={styles.root} aria-label="文档目录">
            <div className={styles.list} role="list">
              {displayItems.length === 0 ? (
                <div className={styles.empty}>暂无标题</div>
              ) : (
                displayItems.map((it) => {
                  const text = normalizeText(it.text) || '（无标题）';
                  const isActive = activeId === it.id;
                  return (
                    <button
                      key={it.id}
                      type="button"
                      role="listitem"
                      className={clsx(
                        styles.item,
                        resolveLevelClass(it.level),
                        it.level === 0 && styles.titleItem,
                        isActive && styles.active
                      )}
                      aria-current={isActive ? 'true' : undefined}
                      title={text}
                      onClick={() => onNavigate(it.id)}
                    >
                      {text}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default NoteOutline;
