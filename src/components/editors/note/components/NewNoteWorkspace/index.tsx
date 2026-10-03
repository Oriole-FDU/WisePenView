import { useDebounceFn, useMemoizedFn, useUnmount } from 'ahooks';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { requestDriveRefresh } from '@/components/business/Drive/driveRefresh';
import { EditorSurfaceProvider } from '@/components/editors/_context';
import { createEditorPresentationStore } from '@/components/editors/_runtime/editorPresentationStore';
import { waitForEditor } from '@/components/editors/_runtime/editorRuntime';
import EditorWorkspacePresentation from '@/components/editors/_runtime/EditorWorkspacePresentation';
import type { Editor, EditorExitContext } from '@/components/editors/editor.type';
import type { CustomBlockNoteEditor } from '@/components/editors/note/CustomBlockNote/registry/noteEditorComposition';
import {
  NoteEditorSessionProvider,
  type NoteEditorSlotName,
} from '@/components/editors/note/CustomBlockNote/session/_context';
import { buildNoteCollaborationUser } from '@/components/editors/note/CustomBlockNote/session/collaborationUser';
import { useNoteService, useUserService } from '@/domains';
import type { NoteInfoDisplayData } from '@/domains/Note';
import { RESOURCE_KIND, RESOURCE_VIEWER } from '@/domains/Resource/model/resourceTarget';
import type { User } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { chatDockActions } from '@/layouts/ChatDockLayout';
import { resourceChatContextActions } from '@/layouts/Resource/_context/chatBinding';
import { useResourceEditor } from '@/layouts/Resource/_context/editor';
import { useResourceHostContext } from '@/layouts/Resource/_context/host';
import { resourceSidePanelActions } from '@/layouts/Resource/ResourceLayout';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import NoteWorkspace from '../NoteWorkspace';
import { createNoteDraftSession, hasNoteDraftContent } from './noteDraftSession';
import { useNewNoteCollaboration } from './useNewNoteCollaboration';

const DRAFT_TARGET = {
  resourceId: '',
  resourceType: RESOURCE_KIND.NOTE,
  viewer: RESOURCE_VIEWER.NOTE,
};
interface NewNoteWorkspaceProps {
  onResourceCreated(resourceId: string): void;
}

function NewNoteContent({ onResourceCreated }: NewNoteWorkspaceProps) {
  const { t } = useTranslation('note');
  const noteService = useNoteService();
  const userService = useUserService();
  const { data: currentUser, refresh: refreshUser } = useApi(() => userService.getUserInfo());
  const {
    routeContext: { driveLocation },
  } = useResourceHostContext();
  const [title, setTitle] = useState('');
  const titleRef = useRef('');
  const savedTitle = useRef('');
  const [titleSaved, setTitleSaved] = useState(true);
  const [resourceId, setResourceId] = useState('');
  const [started, setStarted] = useState(false);
  const saving = useRef(false);
  const active = useRef(true);
  const [session] = useState(createNoteDraftSession);
  const collaboration = useNewNoteCollaboration(session.doc, resourceId, currentUser?.id);
  const ensureResource = useMemoizedFn(() =>
    session.ensureResource(async () => {
      setStarted(true);
      const initialTitle = titleRef.current.trim() || t('title.untitled');
      const result = await noteService.createNote({
        title: initialTitle,
        pathTagId: driveLocation?.mountTagId,
      });
      if (!result.resourceId)
        throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
      if (active.current) {
        savedTitle.current = initialTitle;
        setResourceId(result.resourceId);
        requestDriveRefresh();
      }
      return result.resourceId;
    })
  );
  const { data: info, refresh: refreshInfo } = useApi(
    () => noteService.getNoteInfoDisplay({ resourceId }),
    {
      ready: Boolean(resourceId),
      refreshDeps: [resourceId],
    }
  );
  const noteInfo: NoteInfoDisplayData = info ?? {
    noteTitle: t('title.untitled'),
    authors: [],
    lastEditedAtText: '',
    canCollaborativeEdit: true,
  };
  const {
    loading,
    error,
    run: save,
  } = useApi(
    async () => {
      saving.current = true;
      try {
        const id = await ensureResource();
        // 按最新标题串行保存；正文从挂载起就绑定同一个 Y.Doc，创建与连接不影响输入。
        while (active.current) {
          const nextTitle = titleRef.current.trim() || t('title.untitled');
          if (savedTitle.current === nextTitle) break;
          await noteService.syncTitle({ resourceId: id, newName: nextTitle });
          savedTitle.current = nextTitle;
        }
        if (active.current) setTitleSaved(true);
      } finally {
        saving.current = false;
      }
    },
    { manual: true }
  );
  const persist = useMemoizedFn(() => {
    if (!active.current || saving.current) return;
    save();
  });
  const { run: scheduleTitleSave, cancel: cancelTitleSave } = useDebounceFn(persist, { wait: 500 });
  useUnmount(() => {
    active.current = false;
    cancelTitleSave();
  });
  const connected = collaboration.status === 'connected';
  const bodySaved = connected && collaboration.saveStatus === 'saved';
  const unsaved = started && (!resourceId || !titleSaved || !bodySaved || loading);
  const pendingWork =
    loading ||
    (started && !titleSaved && !error) ||
    (connected && collaboration.saveStatus === 'saving');
  const retry = () => {
    persist();
    refreshUser();
    if (resourceId) refreshInfo();
    collaboration.reconnect();
  };
  const prepareExit = async (context: EditorExitContext, runtime: Editor) => {
    if (!(await waitForEditor(runtime, (snapshot) => !snapshot.pendingWork, context.signal)))
      return false;
    if (!runtime.getSnapshot().hasUnsavedChanges) return true;
    const choice = await context.confirm({
      title: t('draft.leaveTitle'),
      description: t('draft.leaveDescription'),
      confirmText: t('workspace.retry'),
      discardText: t('draft.discard'),
    });
    if (context.signal.aborted || choice === 'cancel') return false;
    if (choice === 'discard') return true;
    retry();
    return false;
  };
  const handleResourceCreated = useMemoizedFn(onResourceCreated);
  /**
   * @wisepen-manual-effect
   * 执行时机：子级工作区已向编辑器宿主提交后端资源身份后升级 URL。
   * 不可替代原因：路由退出守卫读取外部编辑器快照，必须先完成运行时身份上报才能识别同一编辑器。
   * cleanup：同步通知，无延迟任务；路由升级保留当前编辑器和 Y.Doc。
   */
  useEffect(() => {
    if (resourceId) handleResourceCreated(resourceId);
  }, [resourceId, handleResourceCreated]);
  const handleTitleChange = (value: string) => {
    titleRef.current = value;
    setTitle(value);
    if (!started && !value.trim()) return;
    setTitleSaved(false);
    if (!resourceId) persist();
    else scheduleTitleSave();
  };
  const handleDocumentChange = (blocks: CustomBlockNoteEditor['document']) => {
    if (resourceId || (!started && !hasNoteDraftContent(blocks))) return;
    persist();
  };
  return (
    <NewNoteSession
      resourceId={resourceId}
      collaboration={collaboration}
      currentUser={currentUser}
      canCollaborativeEdit={noteInfo.canCollaborativeEdit}
    >
      <NoteWorkspace
        resourceId={resourceId}
        noteInfoDisplay={noteInfo}
        onRefreshNoteInfo={refreshInfo}
        newNote={{
          title,
          onTitleChange: handleTitleChange,
          onDocumentChange: handleDocumentChange,
          ensureResourceId: ensureResource,
          titleSaveStatus: error ? 'failed' : titleSaved ? 'saved' : 'saving',
          hasUnsavedChanges: unsaved,
          pendingWork,
          error,
          retry,
          prepareExit,
        }}
      />
    </NewNoteSession>
  );
}

function NewNoteSession({
  resourceId,
  collaboration,
  currentUser,
  canCollaborativeEdit,
  children,
}: {
  resourceId: string;
  collaboration: ReturnType<typeof useNewNoteCollaboration>;
  currentUser: User | undefined;
  canCollaborativeEdit: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation('note');
  const [slots, setSlots] = useState<Record<NoteEditorSlotName, HTMLElement | null>>({
    aiBulkActions: null,
    findBar: null,
    aiDiffControls: null,
    title: null,
  });
  const setSlot = useMemoizedFn((name: NoteEditorSlotName, node: HTMLElement | null) =>
    setSlots((current) => (current[name] === node ? current : { ...current, [name]: node }))
  );
  const connected = collaboration.status === 'connected';
  return (
    <NoteEditorSessionProvider
      value={{
        runtime: {
          resourceId,
          collaboration: {
            doc: collaboration.doc,
            provider: collaboration.provider,
            user: buildNoteCollaborationUser(currentUser, t('workspace.currentUser')),
            ready: connected,
          },
          state: {
            readOnly: !canCollaborativeEdit,
            blockLocalDocWrites: connected && !canCollaborativeEdit,
          },
          portalContainers: slots,
        },
        ui: {
          status: collaboration.status,
          saveStatus: collaboration.saveStatus,
          reconnect: collaboration.reconnect,
          currentUser,
          isConnected: connected,
          isDisconnected: Boolean(resourceId) && collaboration.status === 'disconnected',
          isTitleReadOnly: !canCollaborativeEdit,
          canRenderBodyEditor: true,
          showFullPageSpin: false,
          middleOverlayText: '',
        },
        titleContainer: slots.title,
        setSlot,
      }}
    >
      {children}
    </NoteEditorSessionProvider>
  );
}

/** 从空白页到正式资源页始终装配完整工作区，后台创建不替换编辑器实例。 */
export default function NewNoteWorkspace({ onResourceCreated }: NewNoteWorkspaceProps) {
  const { registerEditor } = useResourceEditor();
  const host = useResourceHostContext();
  const [store] = useState(createEditorPresentationStore);
  const [resourceId, setResourceId] = useState('');
  const target = { ...DRAFT_TARGET, resourceId };
  const handleResourceCreated = (id: string) => {
    setResourceId(id);
    onResourceCreated(id);
  };
  return (
    <EditorWorkspacePresentation target={target} store={store}>
      <EditorSurfaceProvider
        kind="note"
        target={target}
        instanceId="new-note"
        host={{
          hostId: host.hostId,
          openChatPanel: chatDockActions.open,
          setChatContext: resourceChatContextActions.setContext,
          openInlineComments: resourceSidePanelActions.openInlineComments,
          navigateResourceHash: host.navigateResourceHash,
        }}
        onRegister={registerEditor}
        onPresentationChange={store.getState().onPresentationChange}
      >
        <NewNoteContent onResourceCreated={handleResourceCreated} />
      </EditorSurfaceProvider>
    </EditorWorkspacePresentation>
  );
}
