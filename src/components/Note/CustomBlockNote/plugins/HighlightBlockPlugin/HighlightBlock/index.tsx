/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import AppIconButton from '@/components/Button/AppIconButton';
import { AppPopover } from '@/components/Overlay';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import data from '@emoji-mart/data';
import en from '@emoji-mart/data/i18n/en.json';
import zh from '@emoji-mart/data/i18n/zh.json';
import { useMemoizedFn } from 'ahooks';
import { Picker } from 'emoji-mart';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNoteEditorReadOnlyContext } from '../../../engines/editor/readOnly';
import {
  highlightBlockConfig,
  readHighlightBlockProps,
  toHighlightBlockStoredProps,
} from '../model';
import styles from './style.module.less';

type HighlightBlockRenderProps = ReactCustomBlockRenderProps<typeof highlightBlockConfig>;

interface EmojiMartSelection {
  native?: string;
}

function HighlightIconPicker({ block, editor }: HighlightBlockRenderProps) {
  const { t, i18n } = useTranslation('note');
  const [open, setOpen] = useState(false);
  const props = readHighlightBlockProps(block as unknown as Record<string, unknown>);
  const emojiLocale = i18n.resolvedLanguage === 'en-US' ? 'en' : 'zh';
  const emojiTranslations = emojiLocale === 'en' ? en : zh;

  const handleSelect = useMemoizedFn((emoji: EmojiMartSelection) => {
    const icon = emoji.native?.trim();
    if (!icon) return;
    editor.updateBlock(block, { props: { icon } });
    setOpen(false);
    window.setTimeout(() => editor.focus());
  });

  const mountPicker = useMemoizedFn((container: HTMLDivElement | null) => {
    if (!container) return;
    const picker = new Picker({
      data,
      i18n: emojiTranslations,
      locale: emojiLocale,
      set: 'native',
      theme: 'auto',
      perLine: 8,
      emojiButtonRadius: '6px',
      emojiButtonSize: 34,
      emojiSize: 22,
      navPosition: 'top',
      previewPosition: 'none',
      skinTonePosition: 'search',
      onEmojiSelect: handleSelect,
    }) as unknown as HTMLElement;
    picker.className = styles.emojiMartPicker;
    container.replaceChildren(picker);
  });

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppIconButton
        icon={<span className={styles.iconGlyph}>{props.icon}</span>}
        label={t('highlight.changeIcon')}
        size="sm"
        isActive={open}
        className={styles.iconButton}
        overlayTrigger={<AppPopover.Trigger />}
        tooltip={{ placement: 'top' }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <AppPopover.Content placement="bottom start" bodyPadding="none">
        <div
          key={emojiLocale}
          ref={mountPicker}
          className={styles.emojiMartHost}
          aria-label={t('highlight.emojiPicker')}
        />
      </AppPopover.Content>
    </AppPopover>
  );
}

function HighlightBlockView({ block, editor, contentRef }: HighlightBlockRenderProps) {
  const { t } = useTranslation('note');
  const readOnly = useNoteEditorReadOnlyContext();
  const props = readHighlightBlockProps(block as unknown as Record<string, unknown>);

  return (
    <div
      className={styles.root}
      data-highlight-background-color={props.backgroundColor}
      data-highlight-border-color={props.borderColor}
      data-highlight-text-color={props.textColor}
      data-highlight-text-alignment={props.textAlignment}
    >
      <div className={styles.iconSlot} contentEditable={false} data-highlight-block-controls="">
        {readOnly ? (
          <span className={styles.readOnlyIcon} aria-hidden="true">
            {props.icon}
          </span>
        ) : (
          <HighlightIconPicker block={block} editor={editor} contentRef={contentRef} />
        )}
      </div>
      <div
        ref={contentRef}
        className={styles.content}
        data-placeholder={t('highlight.placeholder')}
      />
    </div>
  );
}

function HighlightBlockToExternalHTML({ block, contentRef }: HighlightBlockRenderProps) {
  const props = readHighlightBlockProps(block as unknown as Record<string, unknown>);
  return (
    <div
      className={styles.root}
      data-highlight-block=""
      data-highlight-background-color={props.backgroundColor}
      data-highlight-border-color={props.borderColor}
      data-highlight-text-color={props.textColor}
      data-highlight-text-alignment={props.textAlignment}
      data-icon={props.icon}
    >
      <span className={styles.readOnlyIcon} aria-hidden="true">
        {props.icon}
      </span>
      <div ref={contentRef} className={styles.content} />
    </div>
  );
}

/** 飞书风格高亮块；样式属性保存在 block props，正文继续使用 BlockNote inline content。 */
export const createHighlightBlockSpec = createReactBlockSpec(highlightBlockConfig, {
  render: HighlightBlockView,
  toExternalHTML: HighlightBlockToExternalHTML,
  parse: (element) => {
    if (!element.matches('div[data-highlight-block]')) return undefined;
    return toHighlightBlockStoredProps(
      readHighlightBlockProps({
        props: {
          icon: element.dataset.icon,
          highlightBackgroundColor: element.dataset.highlightBackgroundColor,
          highlightBorderColor: element.dataset.highlightBorderColor,
          highlightTextColor: element.dataset.highlightTextColor,
          textAlignment: element.dataset.highlightTextAlignment,
        },
      })
    );
  },
});
