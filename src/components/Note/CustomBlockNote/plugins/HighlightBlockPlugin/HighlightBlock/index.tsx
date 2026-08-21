/* eslint-disable react-refresh/only-export-components -- BlockNote block spec 与展示组件同文件 */
import AppIconButton from '@/components/Button/AppIconButton';
import { EmojiPickerContent } from '@/components/Input';
import { AppPopover } from '@/components/Overlay';
import { createReactBlockSpec, type ReactCustomBlockRenderProps } from '@blocknote/react';
import { useMemoizedFn } from 'ahooks';
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

function HighlightIconPicker({ block, editor }: HighlightBlockRenderProps) {
  const { t } = useTranslation('note');
  const [open, setOpen] = useState(false);
  const props = readHighlightBlockProps(block as unknown as Record<string, unknown>);

  const handleSelect = useMemoizedFn((emoji: string) => {
    const icon = emoji.trim();
    if (!icon) return;
    editor.updateBlock(block, { props: { icon } });
    setOpen(false);
    window.setTimeout(() => editor.focus());
  });

  return (
    <AppPopover isOpen={open} onOpenChange={setOpen} deferContent={false}>
      <AppIconButton
        icon={
          <span className={styles.iconGlyph} data-highlight-block-icon="">
            {props.icon}
          </span>
        }
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
        <EmojiPickerContent ariaLabel={t('highlight.emojiPicker')} onSelect={handleSelect} />
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
          <span className={styles.readOnlyIcon} aria-hidden="true" data-highlight-block-icon="">
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
      <span className={styles.readOnlyIcon} aria-hidden="true" data-highlight-block-icon="">
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
