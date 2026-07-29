import { UnsavedChangesDialog } from '@/components/Overlay';
import type { AgentDetail } from '@/domains/Agent';
import { RESOURCE_KIND } from '@/utils/navigation/resourceTarget';
import type { ResourceHostLayoutConfig } from '@/views/workspace/ResourceHostContext';
import { toast } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import ResourceLayoutConfig from '../../../_components/ResourceLayoutConfig';
import type { AgentVersionItem, AgentWorkspaceData } from '../../model';
import styles from '../../style.module.less';
import AgentEditor from '../AgentEditor';
import AgentHeaderActions from './AgentHeaderActions';
import { useAgentDraftSessionController } from './controllers/useAgentDraftSessionController';

interface AgentWorkspaceProps {
  agent: AgentDetail;
  data: AgentWorkspaceData;
  disabledVersionKeys: Set<string>;
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
  const headerConfig = {
    chatAgentDebug:
      viewingVersion === null
        ? {
            agent: draftSession.currentDraftAgent,
            isDirty: draftSession.isDirty,
            isSaving: draftSession.saveLoading,
            onSaveDraft: draftSession.saveDraftForDebug,
          }
        : undefined,
    header: {
      resource: {
        resourceId: agent.resourceId,
        resourceName: agent.title,
        resourceIconType: 'agent',
        currentActions: agent.currentActions,
        copyVersion: agent.version,
        permissionResourceType: RESOURCE_KIND.AGENT,
        ownerId: agent.ownerId,
        titleMeta: (
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
        ),
        actions: agent.isOwner ? (
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
  } satisfies ResourceHostLayoutConfig;
  const layoutConfigDeps = [
    agent,
    draftSession.draft,
    draftSession.isDirty,
    draftSession.publishLoading,
    draftSession.saveLoading,
    draftSession.savePhase,
    t,
    versionLoading,
    viewingVersion,
  ];

  return (
    <ResourceLayoutConfig className={styles.pageWrap} config={headerConfig} deps={layoutConfigDeps}>
      <>
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
    </ResourceLayoutConfig>
  );
}
