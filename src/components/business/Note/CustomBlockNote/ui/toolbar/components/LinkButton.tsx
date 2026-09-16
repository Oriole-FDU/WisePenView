import { isTableCellSelection } from '@blocknote/core';
import {
  DEFAULT_LINK_PROTOCOL,
  FormattingToolbarExtension,
  LinkToolbarExtension,
  ShowSelectionExtension,
  VALID_LINK_PROTOCOLS,
} from '@blocknote/core/extensions';
import { useBlockNoteEditor, useEditorState, useExtension } from '@blocknote/react';
import { Input } from '@heroui/react';
import { useEventListener, useUnmount } from 'ahooks';
import { Link } from 'lucide-react';
import { type KeyboardEvent as ReactKeyboardEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppPopover from '@/components/base/AppPopover';
import { AppButton } from '@/components/base/Button';
import { blockNoteSchema } from '@/components/business/Note/CustomBlockNote/registry/noteEditorComposition';

import styles from '../style.module.less';
import { blockHasInlineContent, getSelectedBlocks } from '../utils';
import { type ButtonGroupChildProps, ToolbarButton } from './ToolbarButton';

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return trimmedUrl;
  }
  return VALID_LINK_PROTOCOLS.some((protocol) => trimmedUrl.startsWith(protocol))
    ? trimmedUrl
    : `${DEFAULT_LINK_PROTOCOL}://${trimmedUrl}`;
}

interface CreateLinkToolbarButtonProps extends ButtonGroupChildProps {
  onOpenChange?: (open: boolean) => void;
}

export function CreateLinkToolbarButton({
  onOpenChange,
  ...buttonGroupProps
}: CreateLinkToolbarButtonProps) {
  const { t } = useTranslation(['note', 'common']);
  const editor = useBlockNoteEditor(blockNoteSchema);
  const formattingToolbar = useExtension(FormattingToolbarExtension);
  const { deleteLink, editLink } = useExtension(LinkToolbarExtension);
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

  const openLinkPopover = () => {
    if (!state) {
      return;
    }
    setUrl(state.url);
    showSelection(true, 'createLinkButton');
    setOpen(true);
    onOpenChange?.(true);
  };

  const closeLinkPopover = () => {
    showSelection(false, 'createLinkButton');
    setOpen(false);
    onOpenChange?.(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      openLinkPopover();
    } else {
      closeLinkPopover();
    }
  };

  const handleEditorKeyDown = (event: Event) => {
    if (!(event instanceof globalThis.KeyboardEvent)) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openLinkPopover();
    }
  };

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
      deleteLink(state.range.from);
      formattingToolbar.store.setState(false);
      closeLinkPopover();
      window.setTimeout(() => editor.focus());
      return;
    }
    editLink(nextUrl, state.text, state.range.from);
    formattingToolbar.store.setState(false);
    closeLinkPopover();
    window.setTimeout(() => editor.focus());
  };

  const removeLink = () => {
    deleteLink(state.range.from);
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
    <AppPopover isOpen={open} onOpenChange={handleOpenChange} deferContent={false}>
      <ToolbarButton
        {...buttonGroupProps}
        label={state.url ? t('editor.link.edit') : t('editor.link.add')}
        icon={<Link size={20} />}
        overlayTrigger={<AppPopover.Trigger />}
      />
      <AppPopover.Content className={styles.formPopover} placement="bottom">
        <div className={styles.formPanel} onMouseDown={(event) => event.stopPropagation()}>
          <Input
            autoFocus
            aria-label={t('editor.link.address')}
            placeholder={t('editor.link.placeholder')}
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <AppButton size="sm" variant="primary" onPress={saveLink}>
            {t('actions.confirm', { ns: 'common' })}
          </AppButton>
          {state.url ? (
            <AppButton size="sm" variant="danger" onPress={removeLink}>
              {t('actions.remove', { ns: 'common' })}
            </AppButton>
          ) : null}
        </div>
      </AppPopover.Content>
    </AppPopover>
  );
}
