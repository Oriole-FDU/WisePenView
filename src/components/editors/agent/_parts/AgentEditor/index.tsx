import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import AppAlertDialog from '@/components/business/AppAlertDialog';

import styles from '../../_common/style.module.scss';
import { useAgentAssetsController } from './_hooks/useAgentAssetsController';
import AssetsSection from './_parts/AssetsSection';
import BasicInfoSection from './_parts/BasicInfoSection';
import CapabilitiesSection from './_parts/CapabilitiesSection';
import MemorySection from './_parts/MemorySection';
import ModelSection from './_parts/ModelSection';
import SystemPromptSection from './_parts/SystemPromptSection';
import type { AgentEditorProps } from './index.type';

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
  const anchors = anchorSections.map(([id, key]) => ({
    id,
    label: t(`agent:page.anchor.${key}`),
  }));

  return (
    <div className={styles.page}>
      <AppForm.AnchorNav
        title={t('agent:navigation.title')}
        ariaLabel={t('agent:navigation.aria')}
        items={anchors}
        scrollContainerId={AGENT_SCROLL_CONTAINER_ID}
      />
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
