import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import {
  SystemResizableHandle,
  SystemResizablePanel,
  SystemResizablePanelGroup,
} from '@/components/base/SystemResizable';
import AppAlertDialog from '@/components/business/AppAlertDialog';
import type { AgentAsset, AgentSpec } from '@/domains/Agent';
import type { ChatModel, ToolOption } from '@/domains/ChatConfig';
import type { SkillSummary } from '@/domains/Skill';

import type { AgentDraft } from '../../model';
import styles from '../../style.module.scss';
import AgentDisplayName from './components/AgentDisplayName';
import { useAgentAssetsController } from './controllers/useAgentAssetsController';
import AdvancedSettingsSection from './sections/AdvancedSettingsSection';
import AssetsSection from './sections/AssetsSection';
import BasicInfoSection from './sections/BasicInfoSection';
import CapabilitiesSection from './sections/CapabilitiesSection';
import SystemPromptSection from './sections/SystemPromptSection';

interface AgentEditorProps {
  assets: AgentAsset[];
  chatPanel: ReactNode;
  displayName: string;
  draft: AgentDraft;
  draftVersion: number;
  models: ChatModel[];
  readOnly: boolean;
  resourceId: string;
  skills: SkillSummary[];
  tools: ToolOption[];
  onDescriptionChange: (description: string) => void;
  onNameChange: (name: string) => void;
  onDisplayNameChange: (name: string) => Promise<void>;
  onSpecChange: (spec: AgentSpec) => void;
  onSystemPromptChange: (systemPrompt: string) => void;
}

const AGENT_SCROLL_CONTAINER_ID = 'agent-editor-scroll';

export default function AgentEditor({
  assets: sourceAssets,
  chatPanel,
  displayName,
  draft,
  draftVersion,
  models,
  readOnly,
  resourceId,
  skills,
  tools,
  onDescriptionChange,
  onNameChange,
  onDisplayNameChange,
  onSpecChange,
  onSystemPromptChange,
}: AgentEditorProps) {
  const { t } = useTranslation(['agent', 'common']);
  const assets = useAgentAssetsController({
    assets: sourceAssets,
    draftVersion,
    resourceId,
    t,
  });
  return (
    <div className={styles.frame}>
      <div className={styles.page}>
        <SystemResizablePanelGroup orientation="horizontal" className={styles.resizableGroup}>
          <SystemResizablePanel defaultSize="62%" minSize={280} className={styles.formPanel}>
            <main id={AGENT_SCROLL_CONTAINER_ID} className={styles.content}>
              <AgentDisplayName
                key={displayName}
                displayName={displayName}
                disabled={readOnly}
                onRename={onDisplayNameChange}
              />
              <BasicInfoSection
                name={draft.name}
                description={draft.description}
                disabled={readOnly}
                onNameChange={onNameChange}
                onDescriptionChange={onDescriptionChange}
              />
              <SystemPromptSection
                markdown={draft.spec.systemPrompt}
                disabled={readOnly}
                onMarkdownChange={onSystemPromptChange}
              />
              <CapabilitiesSection
                spec={draft.spec}
                tools={tools}
                skills={skills}
                disabled={readOnly}
                onChange={onSpecChange}
              />
              <AssetsSection
                assets={assets.assets}
                disabled={readOnly}
                uploading={assets.uploadLoading}
                onUpload={assets.uploadAssets}
                onDelete={assets.requestDeleteAsset}
              />
              <AdvancedSettingsSection
                spec={draft.spec}
                models={models}
                tools={tools}
                disabled={readOnly}
                onChange={onSpecChange}
              />
            </main>
          </SystemResizablePanel>
          <SystemResizableHandle aria-label={t('agent:page.resizeLayout')} />
          <SystemResizablePanel defaultSize="38%" minSize={280} className={styles.chatPanel}>
            <aside className={styles.chatPanelInner} aria-label={t('agent:page.debugChat')}>
              <div className={styles.chatPanelBody}>{chatPanel}</div>
            </aside>
          </SystemResizablePanel>
        </SystemResizablePanelGroup>
        <AppAlertDialog
          type="danger"
          isOpen={assets.deleteAssetId !== null}
          onOpenChange={(open) => {
            if (!open) assets.closeDeleteAsset();
          }}
          title={t('agent:page.deleteAsset.title')}
          description={t('agent:page.deleteAsset.description')}
          confirmText={t('common:actions.delete')}
          isConfirmLoading={assets.deleteLoading}
          onConfirm={assets.confirmDeleteAsset}
        />
      </div>
    </div>
  );
}
