import { useTranslation } from 'react-i18next';

import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/ChatConfig';

import CapabilityPolicyPanel from '../CapabilityPolicyPanel';

interface Props {
  spec: AgentSpec;
  tools: ToolOption[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function CapabilityOverridesSection({ spec, tools, disabled, onChange }: Props) {
  const { t } = useTranslation('agent');
  const policy = spec.toolAndSkillPolicy;
  const toolOptions = tools.map((tool) => {
    const disabledReason = !tool.enabled
      ? t('capabilities.toolDisabled')
      : tool.requiresConfig && !tool.configured
        ? t('capabilities.toolRequiresConfig')
        : !tool.configured
          ? t('capabilities.toolIncomplete')
          : undefined;
    return {
      id: tool.toolId,
      name: tool.label,
      internalName: tool.toolId,
      description: tool.description,
      disabled: Boolean(disabledReason),
      disabledReason,
    };
  });
  const enabledToolOverrideIds = Object.entries(policy.toolSelectionOverrides)
    .filter(([, enabled]) => enabled)
    .map(([toolId]) => toolId);
  const disabledToolOverrideIds = Object.entries(policy.toolSelectionOverrides)
    .filter(([, enabled]) => !enabled)
    .map(([toolId]) => toolId);

  const updateToolOverrides = (enabled: boolean, toolIds: string[]) => {
    const nextOverrides = Object.fromEntries(
      Object.entries(policy.toolSelectionOverrides).filter(([, value]) => value !== enabled)
    );
    toolIds.forEach((toolId) => {
      nextOverrides[toolId] = enabled;
    });
    onChange({
      ...spec,
      toolAndSkillPolicy: { ...policy, toolSelectionOverrides: nextOverrides },
    });
  };

  return (
    <>
      <CapabilityPolicyPanel
        kind="tool"
        title={t('capabilities.enabledToolOverrides')}
        description={t('capabilities.enabledToolOverridesDescription')}
        addLabel={t('capabilities.addEnabledToolOverride')}
        searchPlaceholder={t('capabilities.searchTool')}
        emptyText={t('capabilities.noTool')}
        selectedEmptyText={t('capabilities.noToolOverride')}
        options={toolOptions}
        selectedIds={enabledToolOverrideIds}
        disabled={disabled}
        onChange={(ids) => updateToolOverrides(true, ids)}
      />
      <CapabilityPolicyPanel
        kind="tool"
        title={t('capabilities.disabledToolOverrides')}
        description={t('capabilities.disabledToolOverridesDescription')}
        addLabel={t('capabilities.addDisabledToolOverride')}
        searchPlaceholder={t('capabilities.searchTool')}
        emptyText={t('capabilities.noTool')}
        selectedEmptyText={t('capabilities.noToolOverride')}
        options={toolOptions}
        selectedIds={disabledToolOverrideIds}
        disabled={disabled}
        onChange={(ids) => updateToolOverrides(false, ids)}
      />
    </>
  );
}
