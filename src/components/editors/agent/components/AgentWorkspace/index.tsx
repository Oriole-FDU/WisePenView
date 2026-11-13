import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import Chat from '@/components/business/Chat';
import EditorPresentationBinding from '@/components/editors/_runtime/EditorPresentationBinding';
import type { EditorPresentation } from '@/components/editors/editor.type';
import { useResourceService } from '@/domains';
import type { AgentDetail } from '@/domains/Agent';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { useApi } from '@/hooks/useApi';

import { useEditorSurface } from '../../../_context';
import { prepareDraftExit } from '../../../_runtime/draftExit';
import { useEditorRuntime } from '../../../_runtime/useEditorRuntime';
import type { AgentVersionItem, AgentWorkspaceData } from '../../model';
import styles from '../../style.module.scss';
import AgentEditor from '../AgentEditor';
import AgentHeaderActions from './AgentHeaderActions';
import { useAgentDebugSendGuardController } from './controllers/useAgentDebugSendGuardController';
import { useAgentDraftSessionController } from './controllers/useAgentDraftSessionController';

interface AgentWorkspaceProps {
  agent: AgentDetail;
  data: AgentWorkspaceData;
  disabledVersionKeys: Set<string>;
  isOwner: boolean;
  resourceId: string;
  versionItems: AgentVersionItem[];
  versionLoading: boolean;
  viewingVersion: number | null;
  onRefresh: () => void;
  onVersionSelect: (version: number) => void;
}

export default function AgentWorkspace({
  agent,
  data,
  disabledVersionKeys,
  isOwner,
  resourceId,
  versionItems,
  versionLoading,
  viewingVersion,
  onRefresh,
  onVersionSelect,
}: AgentWorkspaceProps) {
  const { t } = useTranslation(['agent', 'common']);
  const resourceService = useResourceService();
  const draftSession = useAgentDraftSessionController({
    agent,
    baseAgent: data.agent,
    isOwner,
    onPublished: onRefresh,
    resourceId,
    t,
    versionLoading,
    viewingVersion,
  });
  const handleVersionSelect = (version: number) => {
    if (draftSession.isDirty) {
      toast.warning(t('agent:page.switchVersionBlocked'));
      return;
    }
    onVersionSelect(version);
  };
  /** 只有草稿归属当前编辑者且未切到历史版本时，才把草稿 Agent 交给聊天调试。 */
  const debugAgent =
    isOwner && viewingVersion === null ? draftSession.currentDraftAgent : undefined;
  const debugGuard = useAgentDebugSendGuardController({
    agent: debugAgent,
    isDirty: draftSession.isDirty,
    saveDraft: draftSession.saveDraftForDebug,
  });
  const hostAgentPort = debugAgent
    ? {
        injectedAgents: [debugAgent],
        preferredAgent: debugAgent,
        interceptSend: debugGuard.interceptSend,
      }
    : undefined;
  const renameDisplayName = useApi(
    async (newName: string) => {
      await resourceService.renameResource({ resourceId, newName });
      onRefresh();
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('agent:page.displayNameRenamed'));
      },
    }
  );
  const visibleSaveStatus =
    draftSession.savePhase === 'failed'
      ? 'failed'
      : draftSession.savePhase === 'dirty' || draftSession.savePhase === 'saving'
        ? 'saving'
        : 'clean';
  const { target } = useEditorSurface();
  useEditorRuntime(
    {
      openedResource: {
        ...target,
        resourceName: agent.title,
        version: viewingVersion ?? agent.version,
      },
      loading: versionLoading,
      readOnly: draftSession.isReadOnly,
      hasUnsavedChanges: draftSession.isDirty,
      pendingWork: draftSession.savePhase === 'saving' || draftSession.publishLoading,
      warnBeforeUnload: draftSession.isDirty || draftSession.publishLoading,
    },
    (context, editor) =>
      prepareDraftExit(
        editor,
        context,
        {
          title: t('agent:page.leave.title'),
          description: t('agent:page.leave.description'),
          confirmText: t('agent:page.leave.confirm'),
          discardText: t('agent:page.leave.discard'),
        },
        {
          save: async () => {
            await draftSession.saveDraftRequest();
            await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
          },
          discard: async () => {},
        }
      )
  );
  const headerConfig = {
    chat: false,
    header: {
      resource: {
        resourceId: agent.resourceId,
        resourceName: agent.title,
        resourceIconType: 'agent',
        resourceInfo: agent.resourceInfo,
        currentActions: agent.currentActions,
        copyVersion: agent.version,
        permissionResourceType: RESOURCE_KIND.AGENT,
        ownerId: agent.ownerId,
        onResourceChanged: onRefresh,
        titleMeta:
          isOwner && viewingVersion === null ? (
            <span className={styles.saveStatus} data-phase={visibleSaveStatus}>
              {t(`agent:page.saveStatus.${visibleSaveStatus}`)}
            </span>
          ) : undefined,
        actions: isOwner ? (
          <AgentHeaderActions
            disabledVersionKeys={disabledVersionKeys}
            publishLoading={draftSession.publishLoading}
            versionItems={versionItems}
            versionLoading={versionLoading}
            viewingVersion={viewingVersion}
            onPublish={draftSession.publishDraft}
            onVersionSelect={handleVersionSelect}
          />
        ) : undefined,
      },
    },
  } satisfies EditorPresentation;

  return (
    <>
      <EditorPresentationBinding className={styles.pageWrap} {...headerConfig} />
      <AgentEditor
        assets={agent.assets}
        chatPanel={
          <Chat
            fullWidth="panel"
            resourceId={resourceId}
            showHeader
            showCollapseButton={false}
            hostAgentPort={hostAgentPort}
            titleMeta={
              <span className={styles.chatDebugMeta} title={t('agent:page.debugChatHint')}>
                {t('agent:page.debugChat')}
              </span>
            }
          />
        }
        draft={draftSession.draft}
        displayName={agent.title}
        draftVersion={data.agent.draftVersion}
        models={data.models}
        readOnly={draftSession.isReadOnly}
        resourceId={resourceId}
        skills={data.skills}
        tools={data.tools}
        onDescriptionChange={draftSession.setDescription}
        onNameChange={draftSession.setName}
        onDisplayNameChange={async (name) => {
          await renameDisplayName.runAsync(name);
        }}
        onSpecChange={draftSession.setSpec}
        onSystemPromptChange={draftSession.setSystemPrompt}
      />
      <AppAlertDialog
        type="warning"
        isOpen={debugGuard.isDialogOpen}
        onOpenChange={(open) => {
          if (!open) debugGuard.cancel();
        }}
        title={t('agent:page.debugSave.title')}
        description={t('agent:page.debugSave.description')}
        cancelText={t('common:actions.cancel')}
        confirmText={t('agent:page.debugSave.confirm')}
        isConfirmLoading={debugGuard.saving || draftSession.savePhase === 'saving'}
        onConfirm={() => void debugGuard.confirm()}
      />
    </>
  );
}
