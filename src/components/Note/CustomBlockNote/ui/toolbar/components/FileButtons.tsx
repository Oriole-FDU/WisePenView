import { blockNoteSchema } from '@/components/Note/CustomBlockNote/registry/noteEditorComposition';
import { AppPopover } from '@/components/Overlay';
import { blockHasType, editorHasBlockWithType } from '@blocknote/core';
import { useBlockNoteEditor, useEditorState } from '@blocknote/react';
import { Button, Input } from '@heroui/react';
import { PencilLine } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../style.module.less';
import { getSelectedBlocks, toBlockUpdate } from '../utils';
import { ToolbarButton, type ButtonGroupChildProps } from './ToolbarButton';

export function FileCaptionToolbarButton(buttonGroupProps: ButtonGroupChildProps) {
  const { t } = useTranslation(['note', 'common']);
  const editor = useBlockNoteEditor(blockNoteSchema);
  const [caption, setCaption] = useState('');
  const [open, setOpen] = useState(false);
  const block = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor.isEditable) {
        return undefined;
      }

      const selectedBlocks = getSelectedBlocks(editor);
      if (selectedBlocks.length !== 1) {
        return undefined;
      }

      const selectedBlock = selectedBlocks[0];
      if (
        !blockHasType(selectedBlock, editor, selectedBlock.type, {
          url: 'string',
          caption: 'string',
        })
      ) {
        return undefined;
      }

      return selectedBlock;
    },
  });

  if (!block) {
    return null;
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setCaption(String(block.props.caption ?? ''));
    }
    setOpen(nextOpen);
  };

  const saveCaption = () => {
    if (!editorHasBlockWithType(editor, block.type, { caption: 'string' })) {
      return;
    }
    editor.updateBlock(
      block,
      toBlockUpdate({
        props: { caption },
      })
    );
    setOpen(false);
    window.setTimeout(() => editor.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      saveCaption();
    }
  };

  return (
    <AppPopover isOpen={open} onOpenChange={handleOpenChange} deferContent={false}>
      <AppPopover.Trigger>
        <ToolbarButton
          {...buttonGroupProps}
          label={t('editor.image.editCaption')}
          icon={<PencilLine size={20} />}
        />
      </AppPopover.Trigger>
      <AppPopover.Content className={styles.formPopover} placement="bottom">
        <div className={styles.formPanel} onMouseDown={(event) => event.stopPropagation()}>
          <Input
            autoFocus
            aria-label={t('editor.image.caption')}
            placeholder={t('editor.image.captionPlaceholder')}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button size="sm" variant="primary" onPress={saveCaption}>
            {t('actions.confirm', { ns: 'common' })}
          </Button>
        </div>
      </AppPopover.Content>
    </AppPopover>
  );
}
