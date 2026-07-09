import { blockNoteSchema } from '@/components/Note/CustomBlockNote/blockNoteSchema';
import { Popover } from '@/components/Overlay';
import { isTableCellSelection } from '@blocknote/core';
import {
  DEFAULT_LINK_PROTOCOL,
  FormattingToolbarExtension,
  LinkToolbarExtension,
  ShowSelectionExtension,
  VALID_LINK_PROTOCOLS,
} from '@blocknote/core/extensions';
import { useBlockNoteEditor, useEditorState, useExtension } from '@blocknote/react';
import { Button, Input } from '@heroui/react';
import { useEventListener, useUnmount } from 'ahooks';
import { Link } from 'lucide-react';
import { useCallback, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import styles from '../style.module.less';
import { blockHasInlineContent, getSelectedBlocks } from '../utils';
import { ToolbarButton, type ButtonGroupChildProps } from './ToolbarButton';

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return trimmedUrl;
  }
  return VALID_LINK_PROTOCOLS.some((protocol) => trimmedUrl.startsWith(protocol))
    ? trimmedUrl
    : `${DEFAULT_LINK_PROTOCOL}://${trimmedUrl}`;
}

export function CreateLinkToolbarButton(buttonGroupProps: ButtonGroupChildProps) {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const formattingToolbar = useExtension(FormattingToolbarExtension);
  const { editLink } = useExtension(LinkToolbarExtension);
  const { showSelection } = useExtension(ShowSelectionExtension);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (
        !editor.isEditable ||
        !('link' in editor.schema.inlineContentSchema) ||
        isTableCellSelection(editor.prosemirrorState.selection) ||
        !getSelectedBlocks(editor).find(blockHasInlineContent)
      ) {
        return undefined;
      }

      return {
        url: editor.getSelectedLinkUrl() ?? '',
        text: editor.getSelectedText(),
        range: {
          from: editor.prosemirrorState.selection.from,
          to: editor.prosemirrorState.selection.to,
        },
      };
    },
  });

  const openLinkPopover = useCallback(() => {
    if (!state) {
      return;
    }
    setUrl(state.url);
    showSelection(true, 'createLinkButton');
    setOpen(true);
  }, [showSelection, state]);

  const closeLinkPopover = useCallback(() => {
    showSelection(false, 'createLinkButton');
    setOpen(false);
  }, [showSelection]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        openLinkPopover();
      } else {
        closeLinkPopover();
      }
    },
    [closeLinkPopover, openLinkPopover]
  );

  const handleEditorKeyDown = useCallback(
    (event: Event) => {
      if (!(event instanceof globalThis.KeyboardEvent)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openLinkPopover();
      }
    },
    [openLinkPopover]
  );

  useEventListener('keydown', handleEditorKeyDown, {
    target: editor.domElement,
  });

  useUnmount(() => {
    showSelection(false, 'createLinkButton');
  });

  if (!state) {
    return null;
  }

  const saveLink = () => {
    const nextUrl = normalizeUrl(url);
    if (!nextUrl) {
      return;
    }
    editLink(nextUrl, state.text, state.range.from);
    formattingToolbar.store.setState(false);
    closeLinkPopover();
    window.setTimeout(() => editor.focus());
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      saveLink();
    }
  };

  return (
    <Popover isOpen={open} onOpenChange={handleOpenChange} deferContent={false}>
      <Popover.Trigger>
        <ToolbarButton {...buttonGroupProps} label="添加链接" icon={<Link size={20} />} />
      </Popover.Trigger>
      <Popover.Content className={styles.formPopover} placement="bottom">
        <Popover.Dialog>
          <div className={styles.formPanel} onMouseDown={(event) => event.stopPropagation()}>
            <Input
              autoFocus
              aria-label="链接地址"
              placeholder="输入链接地址"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button size="sm" variant="primary" onPress={saveLink}>
              确定
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
