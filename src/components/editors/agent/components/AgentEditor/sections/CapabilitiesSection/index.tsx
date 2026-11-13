import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/ChatConfig';
import type { SkillSummary } from '@/domains/Skill';

import CapabilityPolicyPanel, { type CapabilityPolicyOption } from './CapabilityPolicyPanel';

interface Props {
  mode: 'basic' | 'advanced';
  spec: AgentSpec;
  tools: ToolOption[];
  skills: SkillSummary[];
  disabled: boolean;
  onChange: (spec: AgentSpec) => void;
}

export default function CapabilitiesSection({
  mode,
  spec,
  tools,
  skills,
  disabled,
  onChange,
}: Props) {
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

  const toolOptions: CapabilityPolicyOption[] = tools.map((tool) => {
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
  const selectedToolIds = policy.enableUseTool
    ? tools
        .filter(
          (tool) => policy.toolSelectionOverrides[tool.toolId] ?? policy.toolSelectionDefaultEnabled
        )
        .map((tool) => tool.toolId)
    : [];
  const selectedSkillIds = policy.enableUseSkill ? policy.onDemandSkillIds : [];

  const updatePolicy = (next: Partial<typeof policy>) => {
    onChange({ ...spec, toolAndSkillPolicy: { ...policy, ...next } });
  };

  const updateSelectedTools = (ids: string[]) => {
    const selectedIds = new Set(ids);
    const nextOverrides = { ...policy.toolSelectionOverrides };
    tools.forEach((tool) => {
      const shouldEnable = selectedIds.has(tool.toolId);
      const override = nextOverrides[tool.toolId];
      if (policy.toolSelectionDefaultEnabled) {
        if (shouldEnable && override === false) delete nextOverrides[tool.toolId];
        if (!shouldEnable && override !== false) nextOverrides[tool.toolId] = false;
      } else {
        if (shouldEnable && override !== true) nextOverrides[tool.toolId] = true;
        if (!shouldEnable && override === true) delete nextOverrides[tool.toolId];
      }
    });
    updatePolicy({
      enableUseTool: ids.length > 0,
      toolSelectionOverrides: nextOverrides,
    });
  };

  const updateSelectedSkills = (ids: string[]) => {
    updatePolicy({
      enableUseSkill: ids.length > 0,
      onDemandSkillIds: ids,
    });
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

  if (mode === 'advanced') {
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

  return (
    <AppForm.Section id="capabilities" title={t('capabilities.title')} variant="editor">
      <CapabilityPolicyPanel
        kind="tool"
        title={t('capabilities.tools')}
        addLabel={t('capabilities.addTool')}
        searchPlaceholder={t('capabilities.searchTool')}
        emptyText={t('capabilities.noTool')}
        selectedEmptyText={t('capabilities.noSelectedTool')}
        options={toolOptions}
        selectedIds={selectedToolIds}
        disabled={disabled}
        onChange={updateSelectedTools}
      />
      <CapabilityPolicyPanel
        kind="skill"
        title={t('capabilities.skills')}
        addLabel={t('capabilities.addSkill')}
        searchPlaceholder={t('capabilities.searchSkill')}
        emptyText={t('capabilities.noSkill')}
        selectedEmptyText={t('capabilities.noSelectedSkill')}
        options={skillOptions}
        selectedIds={selectedSkillIds}
        disabled={disabled}
        onChange={updateSelectedSkills}
      />
    </AppForm.Section>
  );
}
