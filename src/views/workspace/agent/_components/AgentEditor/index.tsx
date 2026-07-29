import AppAlertDialog from '@/components/Overlay/AppAlertDialog';
import type { AgentAsset, AgentSpec } from '@/domains/Agent';
import type { ChatModel, ToolOption } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Skill';
import { useTranslation } from 'react-i18next';
import type { AgentDraft } from '../../model';
import styles from '../../style.module.less';
import AgentSectionNav from './AgentSectionNav';
import { useAgentAssetsController } from './controllers/useAgentAssetsController';
import AssetsSection from './sections/AssetsSection';
import BasicInfoSection from './sections/BasicInfoSection';
import CapabilitiesSection from './sections/CapabilitiesSection';
import MemorySection from './sections/MemorySection';
import ModelSection from './sections/ModelSection';
import SystemPromptSection from './sections/SystemPromptSection';

interface AgentEditorProps {
  assets: AgentAsset[];
  draft: AgentDraft;
  draftVersion: number;
  models: ChatModel[];
  readOnly: boolean;
  resourceId: string;
  skills: SkillSummary[];
  tools: ToolOption[];
  onDescriptionChange: (description: string) => void;
  onNameChange: (name: string) => void;
  onSpecChange: (spec: AgentSpec) => void;
  onSystemPromptChange: (systemPrompt: string) => void;
}

const anchorSections = [
  ['agent-info', 'basic'],
  ['prompt', 'prompt'],
  ['model', 'model'],
  ['capabilities', 'capabilities'],
  ['memory', 'memory'],
  ['assets', 'assets'],
] as const;
const AGENT_SCROLL_CONTAINER_ID = 'agent-editor-scroll';

export default function AgentEditor({
  assets: sourceAssets,
  draft,
  draftVersion,
  models,
  readOnly,
  resourceId,
  skills,
  tools,
  onDescriptionChange,
  onNameChange,
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
  const anchors = anchorSections.map(([id, key]) => [id, t(`agent:page.anchor.${key}`)] as const);

  return (
    <div className={styles.page}>
      <AgentSectionNav items={anchors} scrollContainerId={AGENT_SCROLL_CONTAINER_ID} />
      <main id={AGENT_SCROLL_CONTAINER_ID} className={styles.content}>
        <BasicInfoSection
          name={draft.name}
          description={draft.description}
          spec={draft.spec}
          disabled={readOnly}
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
          onSpecChange={onSpecChange}
        />
        <SystemPromptSection
          markdown={draft.spec.systemPrompt}
          disabled={readOnly}
          onMarkdownChange={onSystemPromptChange}
        />
        <ModelSection
          spec={draft.spec}
          models={models}
          disabled={readOnly}
          onChange={onSpecChange}
        />
        <CapabilitiesSection
          spec={draft.spec}
          tools={tools}
          skills={skills}
          disabled={readOnly}
          onChange={onSpecChange}
        />
        <MemorySection spec={draft.spec} disabled={readOnly} onChange={onSpecChange} />
        <AssetsSection
          assets={assets.assets}
          disabled={readOnly}
          uploading={assets.uploadLoading}
          onUpload={assets.uploadAssets}
          onDelete={assets.requestDeleteAsset}
        />
      </main>
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
  );
}
