import { useMount } from 'ahooks';
import { ChevronDown, ChevronRight, ChevronUp, Replace, ReplaceAll, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';

import type { NoteFindResult } from '../../index.type';
import styles from './style.module.less';

interface FindBarProps {
  query: string;
  replacement: string;
  result: NoteFindResult | null;
  replaced: number;
  canReplace: boolean;
  onQueryChange: (query: string) => void;
  onReplacementChange: (replacement: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onReplaceCurrent: () => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

function FindBar({
  query,
  replacement,
  result,
  replaced,
  canReplace,
  onQueryChange,
  onReplacementChange,
  onPrevious,
  onNext,
  onReplaceCurrent,
  onReplaceAll,
  onClose,
}: FindBarProps) {
  const { t } = useTranslation('note');
  const inputRef = useRef<HTMLInputElement>(null);
  const [replaceOpen, setReplaceOpen] = useState(true);

  // 挂载时聚焦输入框。
  useMount(() => {
    inputRef.current?.focus();
  });

  const isNavigationDisabled = result === null;

  return (
    <div
      className={`${styles.root} ${replaceOpen ? styles.rootReplaceOpen : styles.rootFindOnly}`}
      role="search"
      aria-label={t('find.region')}
    >
      <AppIconButton
        className={styles.replaceToggle}
        icon={replaceOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        label={t('find.toggleReplace')}
        onPress={() => setReplaceOpen((open) => !open)}
        tooltip={{ placement: 'bottom', triggerClassName: styles.replaceToggleTrigger }}
      />
      <div className={styles.fields}>
        <div className={styles.fieldRow}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            placeholder={t('find.query')}
            aria-label={t('find.query')}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <span className={styles.count} aria-live="polite">
            {result
              ? t('find.result', { current: result.current, total: result.total })
              : t('find.noMatches')}
          </span>
        </div>
        {replaceOpen ? (
          <div className={styles.fieldRow}>
            <input
              className={styles.input}
              type="text"
              value={replacement}
              placeholder={t('find.replacement')}
              aria-label={t('find.replaceWith')}
              disabled={!canReplace}
              onChange={(e) => onReplacementChange(e.target.value)}
            />
            <span className={styles.replaceCount} aria-live="polite">
              {replaced > 0 ? t('find.replaced', { count: replaced }) : ''}
            </span>
          </div>
        ) : null}
      </div>
      <div className={styles.actionControls}>
        <div className={styles.actionRow}>
          <AppIconButton
            icon={<ChevronUp size={16} />}
            label={t('find.previous')}
            isDisabled={isNavigationDisabled}
            onPress={onPrevious}
            tooltip={{ placement: 'left' }}
          />
          <AppIconButton
            icon={<ChevronDown size={16} />}
            label={t('find.next')}
            isDisabled={isNavigationDisabled}
            onPress={onNext}
            tooltip={{ placement: 'left' }}
          />
        </div>
        {replaceOpen ? (
          <div className={styles.actionRow}>
            <AppIconButton
              icon={<Replace size={16} />}
              label={t('find.replaceCurrent')}
              isDisabled={isNavigationDisabled || !canReplace}
              onPress={onReplaceCurrent}
              tooltip={{ placement: 'left' }}
            />
            <AppIconButton
              icon={<ReplaceAll size={16} />}
              label={t('find.replaceAll')}
              isDisabled={isNavigationDisabled || !canReplace}
              onPress={onReplaceAll}
              tooltip={{ placement: 'left' }}
            />
          </div>
        ) : null}
      </div>
      <AppIconButton
        className={styles.closeButton}
        icon={<X size={16} />}
        label={t('find.close')}
        onPress={onClose}
        tooltip={{ placement: 'left' }}
      />
    </div>
  );
}

export default FindBar;
