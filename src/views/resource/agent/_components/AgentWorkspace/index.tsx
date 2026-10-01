import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';

import AppAlertDialog from '@/components/business/AppAlertDialog';
import UnsavedChangesDialog from '@/components/business/UnsavedChangesDialog';
import type { AgentDetail } from '@/domains/Agent';
import { RESOURCE_KIND } from '@/domains/Resource/model/resourceTarget';
import { ResourceChatBinding } from '@/layouts/Resource/_context';

import ResourceWorkspace, {
  type ResourceWorkspaceProps,
} from '../../../_components/ResourceWorkspace';
import type { AgentVersionItem, AgentWorkspaceData } from '../../model';
import styles from '../../style.module.less';
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
  const headerConfig = {
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
        titleMeta: isOwner ? (
          <span className={styles.saveStatus}>
            {t(
              `agent:page.saveStatus.${
                draftSession.savePhase === 'dirty' ||
                draftSession.savePhase === 'saving' ||
                draftSession.savePhase === 'failed'
                  ? draftSession.savePhase
                  : 'clean'
              }`
            )}
          </span>
        ) : undefined,
        actions: isOwner ? (
          <AgentHeaderActions
            disabledVersionKeys={disabledVersionKeys}
            isDirty={draftSession.isDirty}
            publishLoading={draftSession.publishLoading}
            saveLoading={draftSession.saveLoading}
            versionItems={versionItems}
            versionLoading={versionLoading}
            viewingVersion={viewingVersion}
            onPublish={draftSession.publishDraft}
            onSave={draftSession.saveDraft}
            onVersionSelect={handleVersionSelect}
          />
        ) : undefined,
      },
    },
  } satisfies Omit<ResourceWorkspaceProps, 'children'>;

  return (
    <ResourceWorkspace className={styles.pageWrap} {...headerConfig}>
      <>
        <ResourceChatBinding resourceId={resourceId} hostAgentPort={hostAgentPort} />
        <AgentEditor
          assets={agent.assets}
          draft={draftSession.draft}
          draftVersion={data.agent.draftVersion}
          models={data.models}
          readOnly={draftSession.isReadOnly}
          resourceId={resourceId}
          skills={data.skills}
          tools={data.tools}
          onDescriptionChange={draftSession.setDescription}
          onNameChange={draftSession.setName}
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
          isConfirmLoading={debugGuard.saving || draftSession.saveLoading}
          onConfirm={() => void debugGuard.confirm()}
        />
        <UnsavedChangesDialog
          type="confirm"
          isOpen={draftSession.isLeaveBlocked}
          isLoading={draftSession.saveLoading}
          title={t('agent:page.leave.title')}
          description={t('agent:page.leave.description')}
          cancelText={t('common:actions.cancel')}
          discardText={t('agent:page.leave.discard')}
          confirmText={t('agent:page.leave.confirm')}
          onCancel={draftSession.cancelLeave}
          onDiscard={draftSession.discardLeave}
          onConfirm={() => void draftSession.saveAndLeave()}
        />
      </>
    </ResourceWorkspace>
  );
}
