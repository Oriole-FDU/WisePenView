import { useMemoizedFn } from 'ahooks';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserService } from '@/domains';
import { type NoteAiDiffPreviewData, useNoteSession } from '@/domains/Note';
import { useApi } from '@/hooks/useApi';
import { useSmoothFlag } from '@/hooks/useSmoothFlag';

import { buildNoteCollaborationUser } from './session/collaborationUser';
import {
  NoteEditorSessionContext,
  type NoteEditorSlotName,
  useNoteEditorSessionContext,
} from './session/NoteEditorSessionContext';

export function NoteEditorSession({
  resourceId,
  canCollaborativeEdit,
  aiDiffPreview,
  children,
}: {
  resourceId: string;
  canCollaborativeEdit: boolean;
  aiDiffPreview?: NoteAiDiffPreviewData;
  children: ReactNode;
}) {
  const { t } = useTranslation('note');
  const userService = useUserService();
  const { data: currentUser, error: currentUserError } = useApi(() => userService.getUserInfo());
  const shouldWaitCurrentUser = !currentUser && !currentUserError;
  const { status, saveStatus, doc, provider, reconnect, idbSynced } = useNoteSession(resourceId, {
    actorUserId: currentUser?.id,
    enabled: !shouldWaitCurrentUser,
    localOnly: Boolean(aiDiffPreview),
  });
  const [slots, setSlots] = useState<Record<NoteEditorSlotName, HTMLElement | null>>({
    aiBulkActions: null,
    findBar: null,
    aiDiffControls: null,
    title: null,
  });
  const setSlot = useMemoizedFn((name: NoteEditorSlotName, node: HTMLElement | null) => {
    setSlots((current) => (current[name] === node ? current : { ...current, [name]: node }));
  });
  const isConnected = status === 'connected';
  const isDisconnected = useSmoothFlag(status === 'disconnected', 2000, 2000);
  const value = {
    runtime: {
      resourceId,
      collaboration: {
        doc,
        provider,
        user: buildNoteCollaborationUser(currentUser, t('workspace.currentUser')),
        ready: isConnected,
      },
      // 连接中不能拦截 BlockNote 初始化写入，首次服务端同步前也不能导入正文。
      state: {
        readOnly: status === 'connecting' || !canCollaborativeEdit,
        blockLocalDocWrites: isConnected && !canCollaborativeEdit,
      },
      aiDiffPreview,
      portalContainers: slots,
    },
    ui: {
      status,
      saveStatus,
      reconnect,
      currentUser,
      isConnected,
      isDisconnected,
      isTitleReadOnly: !canCollaborativeEdit,
      canRenderBodyEditor: !shouldWaitCurrentUser,
      showFullPageSpin: (status === 'connecting' && !idbSynced) || shouldWaitCurrentUser,
      middleOverlayText:
        status === 'connecting' && !idbSynced
          ? t('workspace.connecting')
          : t('workspace.loadingUser'),
    },
    titleContainer: slots.title,
    setSlot,
  };
  return <NoteEditorSessionContext value={value}>{children}</NoteEditorSessionContext>;
}

export function NoteEditorSlot({
  name,
  className,
  children,
}: {
  name: NoteEditorSlotName;
  className?: string;
  children?: ReactNode;
}) {
  const { setSlot } = useNoteEditorSessionContext();
  const setContainer = useMemoizedFn((node: HTMLDivElement | null) => setSlot(name, node));
  return (
    <div ref={setContainer} className={className}>
      {children}
    </div>
  );
}
