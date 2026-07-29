import { useInlineCommentService, useInteractService, useUserService } from '@/domains';
import type {
  NoteInfoDisplayData,
  NoteInlineCommentDraft,
  NoteSelectionSnapshot,
} from '@/domains/Note';
import type {
  NoteBodyEditorHandle,
  NoteCollaborationUser,
} from '@/components/Note/CustomBlockNote/index.type';
import {
  NoteInlineCommentSession,
  useNoteSession,
} from '@/domains/Note';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';
import { parseErrorMessage } from '@/utils/error';
import { useResourceHostChatContextActions } from '@/views/workspace/ResourceHostContext';
import { useWorkspaceResourceSidePanelStore } from '@/views/workspace/_store/useWorkspaceResourceSidePanelStore';
import { useRequest, useUnmount, useMemoizedFn } from 'ahooks';
import type { TFunction } from 'i18next';
import { useState, useSyncExternalStore, type RefObject } from 'react';
import { toast } from '@heroui/react';
import {
  createNoteChatStateProvider,
  createNoteSelectionChatContext,
} from '../../NoteChatProtocol';
import {
  buildNoteCollaborationUser,
  downloadTextArtifact,
  sanitizeDownloadFileName,
} from './noteWorkspaceModel';
import type { NoteTitleHandle } from '../NoteTitle';

const INLINE_COMMENT_POLLING_INTERVAL = 8_000;

interface UseNoteWorkspaceControllerOptions {
  bodyEditorRef: RefObject<NoteBodyEditorHandle | null>;
  fallbackNoteTitle: string;
  isNoteClientContentSignaturePending: boolean;
  noteInfoDisplay: NoteInfoDisplayData;
  noteClientContentSignature: string | undefined;
  resourceId: string;
  t: TFunction<'note'>;
  titleEditorRef: RefObject<NoteTitleHandle | null>;
  untitledTitle: string;
}

export function useNoteWorkspaceController({
  bodyEditorRef,
  fallbackNoteTitle,
  isNoteClientContentSignaturePending,
  noteInfoDisplay,
  noteClientContentSignature,
  resourceId,
  t,
  titleEditorRef,
  untitledTitle,
}: UseNoteWorkspaceControllerOptions) {
  const { setChatContext } = useResourceHostChatContextActions();
  const setResourceSidePanelMode = useWorkspaceResourceSidePanelStore((state) => state.setMode);
  const interactService = useInteractService();
  const inlineCommentService = useInlineCommentService();
  const userService = useUserService();
  const [inlineCommentSession] = useState(
    () => new NoteInlineCommentSession({ resourceId, inlineCommentService })
  );
  const inlineCommentSnapshot = useSyncExternalStore(
    inlineCommentSession.subscribe,
    inlineCommentSession.getSnapshot
  );
  const { data: currentUser, error: currentUserError } = useRequest(() =>
    userService.getUserInfo()
  );
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const { status, saveStatus, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId, {
    actorUserId: currentUser?.id,
    enabled: !shouldWaitCurrentUser,
    localOnly: Boolean(noteInfoDisplay.aiDiffPreview),
  });
  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const isEditorReadOnly = status === 'connecting' || !noteInfoDisplay.canCollaborativeEdit;
  const isTitleReadOnly = !noteInfoDisplay.canCollaborativeEdit;
  const blockLocalDocWrites = isConnected && !noteInfoDisplay.canCollaborativeEdit;
  const showFullPageSpin = (status === 'connecting' && !idbSynced) || shouldWaitCurrentUser;
  const middleOverlayText =
    status === 'connecting' && !idbSynced ? t('workspace.connecting') : t('workspace.loadingUser');
  const collaborationUser: NoteCollaborationUser = buildNoteCollaborationUser(
    currentUser,
    t('workspace.currentUser')
  );
  const canRenderBodyEditor = !shouldWaitCurrentUser;
  const [exportPending, setExportPending] = useState(false);
  const [inlineCommentDraft, setInlineCommentDraft] = useState<NoteInlineCommentDraft>();
  const [activeInlineCommentThreadId, setActiveInlineCommentThreadId] = useState<string>();
  const [inlineCommentScrollTarget, setInlineCommentScrollTarget] = useState<{
    threadId: string;
  }>();
  const [isInlineCommentHistoryOpen, setIsInlineCommentHistoryOpen] = useState(false);

  useRequest(() => interactService.recordResourceRead(resourceId), {
    refreshDeps: [resourceId],
  });

  useRequest(() => inlineCommentSession.refresh(), {
    pollingInterval: INLINE_COMMENT_POLLING_INTERVAL,
    refreshDeps: [inlineCommentSession],
  });

  useUnmount(() => inlineCommentSession.destroy());

  const handlePrintPdf = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info(t('export.editorNotReady'));
      return;
    }
    const titleApi = titleEditorRef.current;
    const title = titleApi?.getPlainTitle() ?? fallbackNoteTitle ?? untitledTitle;
    const titleRoot = titleApi?.getProseMirrorRoot() ?? null;
    try {
      setExportPending(true);
      await bodyApi.exportPdf({ title, titleRoot });
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const handleDownloadMarkdown = useMemoizedFn(async () => {
    const bodyApi = bodyEditorRef.current;
    if (!bodyApi) {
      toast.info(t('export.editorNotReady'));
      return;
    }
    try {
      setExportPending(true);
      const title = titleEditorRef.current?.getPlainTitle() ?? fallbackNoteTitle ?? untitledTitle;
      const artifact = bodyApi.exportMarkdown();
      downloadTextArtifact({
        content: artifact.content,
        mimeType: artifact.mimeType,
        fileName: `${sanitizeDownloadFileName(title, untitledTitle)}.${artifact.extension}`,
      });
      toast.success(t('export.markdownStarted'));
    } catch (err) {
      toast.danger(parseErrorMessage(err));
    } finally {
      setExportPending(false);
    }
  });

  const noteChatStateProvider = createNoteChatStateProvider({
    resourceId,
    syncStatus: status,
    isClientContentSignaturePending: isNoteClientContentSignaturePending,
    clientContentSignature: noteClientContentSignature,
  });

  const handleAskAi = useMemoizedFn((selection: NoteSelectionSnapshot) => {
    setChatContext(createNoteSelectionChatContext(resourceId, selection));
  });

  const handleInlineCommentCreateRequest = useMemoizedFn((draft: NoteInlineCommentDraft) => {
    setInlineCommentDraft(draft);
    setResourceSidePanelMode(resourceId, 'inlineComment');
  });

  const handleInlineCommentThreadSelect = useMemoizedFn((threadId: string) => {
    setActiveInlineCommentThreadId(threadId);
    setInlineCommentScrollTarget({ threadId });
    setResourceSidePanelMode(resourceId, 'inlineComment');
  });

  const inlineCommentsBinding = {
    session: inlineCommentSession,
    onCreateRequest: handleInlineCommentCreateRequest,
    onThreadSelect: handleInlineCommentThreadSelect,
  };

  return {
    activeInlineCommentThreadId,
    blockLocalDocWrites,
    canRenderBodyEditor,
    collaborationUser,
    currentUser,
    currentUserError,
    doc,
    exportPending,
    handleAskAi,
    handleDownloadMarkdown,
    handleInlineCommentThreadSelect,
    handlePrintPdf,
    idbSynced,
    inlineCommentDraft,
    inlineCommentScrollTarget,
    inlineCommentSession,
    inlineCommentSnapshot,
    inlineCommentsBinding,
    isConnected,
    isDisconnected,
    isEditorReadOnly,
    isInlineCommentHistoryOpen,
    isTitleReadOnly,
    middleOverlayText,
    noteChatStateProvider,
    provider,
    reconnect,
    saveStatus,
    setActiveInlineCommentThreadId,
    setInlineCommentDraft,
    setInlineCommentScrollTarget,
    setIsInlineCommentHistoryOpen,
    shouldWaitCurrentUser,
    showFullPageSpin,
    status,
  };
}
