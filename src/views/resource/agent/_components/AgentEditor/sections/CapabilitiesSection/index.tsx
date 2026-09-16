import { useTranslation } from 'react-i18next';

import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Skill';

import SectionShell from '../../shared/SectionShell';
import SettingRow from '../../shared/SettingRow';
import CapabilityPolicyPanel, { type CapabilityPolicyOption } from './CapabilityPolicyPanel';

interface Props {
  spec: AgentSpec;
  tools: ToolOption[];
  skills: SkillSummary[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function CapabilitiesSection({ spec, tools, skills, disabled, onChange }: Props) {
  const { t } = useTranslation('agent');
  const policy = spec.toolAndSkillPolicy;
  const enabledToolOverrideIds = Object.entries(policy.toolSelectionOverrides)
    .filter(([, enabled]) => enabled)
    .map(([toolId]) => toolId);
  const disabledToolOverrideIds = Object.entries(policy.toolSelectionOverrides)
    .filter(([, enabled]) => !enabled)
    .map(([toolId]) => toolId);

  const getToolAvailabilityReason = (tool: ToolOption) => {
    if (!tool.enabled) return t('capabilities.toolDisabled');
    if (tool.requiresConfig && !tool.configured) return t('capabilities.toolRequiresConfig');
    if (!tool.configured) return t('capabilities.toolIncomplete');
    return undefined;
  };

  const toToolOptions = (): CapabilityPolicyOption[] =>
    tools.map((tool) => {
      const disabledReason = getToolAvailabilityReason(tool);
      return {
        id: tool.toolId,
        name: tool.label,
        internalName: tool.toolId,
        description: tool.description,
        disabled: Boolean(disabledReason),
        disabledReason,
      };
    });

  const skillOptions: CapabilityPolicyOption[] = skills.map((skill) => ({
    id: skill.resourceId,
    name: skill.title,
    internalName: skill.skillName,
    description: skill.description,
  }));
  const toolOptions = toToolOptions();

  const updatePolicy = (next: Partial<typeof policy>) => {
    onChange({ ...spec, toolAndSkillPolicy: { ...policy, ...next } });
  };

  const updateToolOverrides = (enabled: boolean, toolIds: string[]) => {
    const nextOverrides = Object.fromEntries(
      Object.entries(policy.toolSelectionOverrides).filter(([, value]) => value !== enabled)
    );
    toolIds.forEach((toolId) => {
      nextOverrides[toolId] = enabled;
    });
    updatePolicy({ toolSelectionOverrides: nextOverrides });
  };

  return (
    <SectionShell
      id="capabilities"
      title={t('capabilities.title')}
      description={t('capabilities.description')}
    >
      <SettingRow
        title={t('capabilities.defaultToolSelection')}
        description={t('capabilities.defaultToolSelectionDescription')}
        selected={policy.toolSelectionDefaultEnabled}
        disabled={disabled}
        onChange={(value) => updatePolicy({ toolSelectionDefaultEnabled: value })}
      />
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
      <CapabilityPolicyPanel
        kind="skill"
        title={t('capabilities.onDemandSkill')}
        description={t('capabilities.onDemandSkillDescription')}
        addLabel={t('capabilities.addOnDemandSkill')}
        searchPlaceholder={t('capabilities.searchSkill')}
        emptyText={t('capabilities.noSkill')}
        selectedEmptyText={t('capabilities.noSelectedSkill')}
        options={skillOptions}
        selectedIds={policy.onDemandSkillIds}
        disabled={disabled}
        onChange={(ids) => updatePolicy({ onDemandSkillIds: ids })}
      />
    </SectionShell>
  );
}
