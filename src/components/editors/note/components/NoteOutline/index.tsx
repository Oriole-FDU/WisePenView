import { clsx } from 'clsx';
import { ChevronsLeft, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AppPressable } from '@/components/base/Button';
import AppIconButton from '@/components/base/Button/AppIconButton';
import { GuideAnchor } from '@/components/base/Guide';
import type { NoteOutlineItem } from '@/components/editors/note/CustomBlockNote/index.type';
import { GUIDE_TOOL_ID } from '@/constants/tour';

import styles from './style.module.scss';

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
  const { t } = useTranslation('note');
  const displayItems = [{ id: NOTE_OUTLINE_TITLE_ID, level: 0, text: title }, ...items];

  if (!open) {
    return (
      <div className={styles.collapsedPanel}>
        <div className={styles.collapsedContent} aria-label={t('outline.expand')}>
          <GuideAnchor id={GUIDE_TOOL_ID.noteOutline}>
            <AppIconButton
              icon={<Menu size={20} aria-hidden="true" />}
              label={t('outline.expand')}
              className={styles.toggleButton}
              onClick={() => onOpenChange(true)}
            />
          </GuideAnchor>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel} data-guide-tool-id={GUIDE_TOOL_ID.noteOutlinePanel}>
      <aside className={styles.aside} aria-label={t('outline.sidebar')}>
        <div className={styles.header}>
          <span className={styles.title}>{t('outline.title')}</span>
          <GuideAnchor id={GUIDE_TOOL_ID.noteOutline}>
            <AppIconButton
              icon={<ChevronsLeft size={20} aria-hidden="true" />}
              label={t('outline.collapse')}
              className={styles.toggleButton}
              onClick={() => onOpenChange(false)}
            />
          </GuideAnchor>
        </div>
        <div className={styles.scrollArea}>
          <GuideAnchor id={GUIDE_TOOL_ID.noteOutlineOpen} layout="area">
            <nav className={styles.root} aria-label={t('outline.document')}>
              <div className={styles.list}>
                {displayItems.length === 0 ? (
                  <div className={styles.empty}>{t('outline.empty')}</div>
                ) : (
                  displayItems.map((it) => {
                    const text = normalizeText(it.text) || t('outline.untitled');
                    const isActive = activeId === it.id;
                    return (
                      <AppPressable
                        key={it.id}
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
                      </AppPressable>
                    );
                  })
                )}
              </div>
            </nav>
          </GuideAnchor>
        </div>
      </aside>
    </div>
  );
}

export default NoteOutline;
