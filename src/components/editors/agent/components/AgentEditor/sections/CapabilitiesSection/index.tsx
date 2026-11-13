import { useTranslation } from 'react-i18next';

import AppForm from '@/components/base/AppForm';
import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/ChatConfig';
import type { SkillSummary } from '@/domains/Skill';

import CapabilityPolicyPanel from './CapabilityPolicyPanel';

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
  const skillOptions = skills.map((skill) => ({
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
        onChange={(ids) =>
          updatePolicy({
            enableUseSkill: ids.length > 0,
            onDemandSkillIds: ids,
          })
        }
      />
    </AppForm.Section>
  );
}
