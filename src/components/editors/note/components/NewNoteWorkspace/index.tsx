import '@blocknote/mantine/style.css';

import { en, zh } from '@blocknote/core/locales';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import { useMemoizedFn, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import { EditorSurfaceProvider } from '@/components/editors/_context';
import { useEditorRuntime } from '@/components/editors/_runtime/useEditorRuntime';
import { usePendingNoteDraftStore } from '@/components/editors/note/_store/usePendingNoteDraftStore';
import {
  blockNoteSchema,
  collectNoteEditorExtensions,
  collectNoteEditorProps,
  notePluginRegistry,
} from '@/components/editors/note/CustomBlockNote/registry/noteEditorComposition';
import {
  useNoteImageUploadEditorBinding,
  useNoteImageUploadRuntime,
} from '@/components/editors/note/CustomBlockNote/runtime/useNoteImageUploadRuntime';
import editorStyles from '@/components/editors/note/CustomBlockNote/style.module.less';
import NoteSideMenu from '@/components/editors/note/CustomBlockNote/ui/sideMenu';
import NoteSlashMenu from '@/components/editors/note/CustomBlockNote/ui/slashMenu';
import { useNoteService } from '@/domains';
import { RESOURCE_KIND, RESOURCE_VIEWER } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';
import { useOpenResource } from '@/hooks/useOpenResource';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { ResourceLayout } from '@/layouts/Resource/ResourceLayout';
import { useAppTheme } from '@/theme';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import styles from '../../style.module.less';
import NoteTitle from '../NoteTitle';
import { createNoteDraftSession, hasNoteDraftContent } from './noteDraftSession';

const DRAFT_TARGET = {
  resourceId: '',
  resourceType: RESOURCE_KIND.NOTE,
  viewer: RESOURCE_VIEWER.NOTE,
};

function NewNoteContent() {
  const { t, i18n } = useTranslation('note');
  const { resolvedTheme } = useAppTheme();
  const noteService = useNoteService();
  const openResource = useOpenResource();
  const {
    routeContext: { driveLocation },
  } = useResourceHostContext();
  const [title, setTitle] = useState('');
  const titleRef = useRef('');
  const [dirty, setDirty] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const pendingImages = useRef(0);
  const composing = useRef(false);
  const focusBody = useRef(false);
  const saving = useRef(false);
  const handedOff = useRef(false);
  const active = useRef(true);
  useUnmount(() => {
    active.current = false;
  });
  const [session] = useState(createNoteDraftSession);
  const ensureResource = () =>
    session.ensureResource(async () => {
      const result = await noteService.createNote({
        title: titleRef.current.trim() || t('title.untitled'),
        pathTagId: driveLocation?.mountTagId,
      });
      if (!result.resourceId)
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      return result.resourceId;
    });
  const handleUploadCountChange = (count: number) => {
    pendingImages.current = count;
    if (count === 0)
      queueMicrotask(() => {
        if (active.current) persist();
      });
  };
  const uploads = useNoteImageUploadRuntime({
    resourceId: '',
    getResourceId: ensureResource,
    readOnly: finalizing,
    onPendingCountChange: handleUploadCountChange,
  });
  const editor = useCreateBlockNote({
    schema: blockNoteSchema,
    dictionary: i18n.resolvedLanguage === 'en-US' ? en : zh,
    extensions: collectNoteEditorExtensions(notePluginRegistry),
    _tiptapOptions: { editorProps: collectNoteEditorProps(notePluginRegistry) },
    uploadFile: uploads.uploadFile,
  });
  useNoteImageUploadEditorBinding({ editor, runtime: uploads });

  const {
    loading,
    error,
    run: save,
  } = useApi(
    async () => {
      saving.current = true;
      try {
        const resourceId = await ensureResource();
        // 输入法和图片上传结束后再交接，避免截断组合输入或丢失图片 URL。
        if (!active.current || composing.current || pendingImages.current > 0) return;
        let savedTitle: string;
        do {
          savedTitle = titleRef.current.trim() || t('title.untitled');
          await noteService.syncTitle({ resourceId, newName: savedTitle });
        } while (savedTitle !== (titleRef.current.trim() || t('title.untitled')));
        if (!active.current || composing.current || pendingImages.current > 0) return;
        setFinalizing(true);
        usePendingNoteDraftStore.getState().setDraft(resourceId, {
          blocks: editor.document,
          focusBody: focusBody.current,
          selection: {
            from: editor.prosemirrorState.selection.from,
            to: editor.prosemirrorState.selection.to,
          },
        });
        requestDriveRefresh();
        handedOff.current = true;
        setDirty(false);
        openResource({
          resourceId,
          resourceType: RESOURCE_KIND.NOTE,
          driveLocation,
          replace: true,
        });
      } finally {
        saving.current = false;
        if (!handedOff.current) setFinalizing(false);
      }
    },
    { manual: true }
  );
  const persist = useMemoizedFn(() => {
    if (!active.current || saving.current || handedOff.current) return;
    if (!dirty && !titleRef.current.trim() && !hasNoteDraftContent(editor.document)) return;
    setDirty(true);
    save();
  });
  useEditorRuntime(
    {
      openedResource: { ...DRAFT_TARGET, resourceName: title.trim() || t('title.untitled') },
      loading: false,
      readOnly: finalizing,
      hasUnsavedChanges: dirty,
      pendingWork: loading || uploads.pendingCount > 0,
      warnBeforeUnload: dirty,
    },
    async (context) => {
      if (handedOff.current) return true;
      if (!dirty && !saving.current && pendingImages.current === 0) return true;
      if (saving.current || pendingImages.current > 0) return false;
      const choice = await context.confirm({
        title: t('draft.leaveTitle'),
        description: t('draft.leaveDescription'),
        confirmText: t('workspace.retry'),
        discardText: t('draft.discard'),
      });
      if (context.signal.aborted || choice === 'cancel') return false;
      if (choice === 'discard') return true;
      persist();
      return false;
    }
  );

  return (
    <ResourceLayout
      className={styles.pageWrap}
      header={{
        resource: {
          resourceName: title.trim() || t('title.untitled'),
          resourceIconType: 'note',
          permissionResourceType: RESOURCE_KIND.NOTE,
          titleMeta: (
            <span className={styles.headerSaveStatus}>
              {loading ? t('save.saving') : error ? t('save.failed') : t('draft.hint')}
            </span>
          ),
        },
      }}
    >
      <div
        className={styles.mainScroll}
        onCompositionStart={() => {
          composing.current = true;
        }}
        onCompositionEnd={() => {
          composing.current = false;
          persist();
        }}
      >
        <div className={styles.mainCol}>
          <div className={styles.root}>
            {error ? (
              <AppButton variant="secondary" onPress={persist}>
                {t('workspace.retry')}
              </AppButton>
            ) : null}
            <NoteTitle
              id=""
              initialContent=""
              readOnly={finalizing}
              focusOnMount
              onSaveStatusChange={() => undefined}
              onTitleChange={(value) => {
                titleRef.current = value;
                setTitle(value);
                focusBody.current = false;
                persist();
              }}
              onEnterKey={() => {
                focusBody.current = true;
                editor.focus();
              }}
            />
            <div className={`${styles.body} ${editorStyles.editorShell}`}>
              <BlockNoteView
                className="bodyBlockNoteView"
                editor={editor}
                theme={resolvedTheme}
                editable={!finalizing}
                slashMenu={false}
                sideMenu={false}
                onChange={() => {
                  focusBody.current = true;
                  persist();
                }}
              >
                <NoteSlashMenu editor={editor} plugins={notePluginRegistry.contentPlugins} />
                <NoteSideMenu plugins={notePluginRegistry.contentPlugins} />
              </BlockNoteView>
            </div>
          </div>
        </div>
      </div>
    </ResourceLayout>
  );
}

/** 空白页复用资源宿主的导航保护，但不会上报后端资源身份或请求资源信息。 */
export default function NewNoteWorkspace() {
  const { registerEditor } = useResourceEditor();
  const host = useResourceHostContext();
  return (
    <EditorSurfaceProvider
      kind="note"
      target={DRAFT_TARGET}
      instanceId="new-note"
      host={{
        hostId: host.hostId,
        openChatPanel: () => undefined,
        setChatContext: () => undefined,
        openInlineComments: () => undefined,
      }}
      onRegister={registerEditor}
      onPresentationChange={() => () => undefined}
    >
      <NewNoteContent />
    </EditorSurfaceProvider>
  );
}
