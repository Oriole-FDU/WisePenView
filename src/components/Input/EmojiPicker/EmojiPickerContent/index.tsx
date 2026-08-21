import { LoadingState } from '@/components/Feedback';
import { useMemoizedFn } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { createEmojiPickerElement } from './emojiPicker.mount';
import type { EmojiPickerContentProps } from './index.type';
import styles from './style.module.less';

function EmojiPickerContent({ ariaLabel, onSelect }: EmojiPickerContentProps) {
  const { i18n, t } = useTranslation('common');
  const emojiLocale = i18n.resolvedLanguage === 'en-US' ? 'en' : 'zh';
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const mountVersionRef = useRef(0);

  const mountPicker = useMemoizedFn((container: HTMLDivElement | null) => {
    const mountVersion = ++mountVersionRef.current;
    if (!container) return;
    setLoadState('loading');
    void createEmojiPickerElement({
      accentColor: getComputedStyle(container).getPropertyValue('--accent'),
      locale: emojiLocale,
      onSelect,
    })
      .then((picker) => {
        if (mountVersionRef.current !== mountVersion) return;
        picker.className = styles.picker;
        container.replaceChildren(picker);
        setLoadState('ready');
      })
      .catch(() => {
        if (mountVersionRef.current !== mountVersion) return;
        container.replaceChildren();
        setLoadState('error');
      });
  });

  return (
    <div
      key={emojiLocale}
      className={styles.host}
      role="group"
      aria-label={ariaLabel ?? t('emoji.pickerAria')}
      aria-busy={loadState === 'loading' || undefined}
    >
      <div
        ref={mountPicker}
        className={`${styles.pickerMount} ${loadState !== 'ready' ? styles.pickerMountHidden : ''}`}
        aria-hidden={loadState !== 'ready' || undefined}
      />
      {loadState === 'loading' ? (
        <LoadingState className={styles.state} label={t('emoji.loading')} />
      ) : null}
      {loadState === 'error' ? (
        <p className={styles.state} role="alert">
          {t('emoji.loadFailed')}
        </p>
      ) : null}
    </div>
  );
}

export type { EmojiPickerContentProps } from './index.type';
export default EmojiPickerContent;
