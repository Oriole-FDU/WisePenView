import type { AgentSpec } from '@/domains/Agent';
import type { ToolOption } from '@/domains/Chat';
import type { SkillSummary } from '@/domains/Skill';
import { useTranslation } from 'react-i18next';
import CapabilityPolicyPanel, { type CapabilityPolicyOption } from '../CapabilityPolicyPanel';
import SectionShell from '../SectionShell';
import SettingRow from '../SettingRow';

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
  const deniedToolSet = new Set(policy.denyToolNames);
  const defaultAllowedToolIds =
    policy.allowToolNames.length === 0
      ? tools.map((tool) => tool.toolId).filter((toolId) => !deniedToolSet.has(toolId))
      : policy.allowToolNames;
  const onDemandSkillSet = new Set(policy.onDemandSkillIds);
  const forceSkillSet = new Set(policy.forceEnabledSkillIds);

  const getToolAvailabilityReason = (tool: ToolOption) => {
    if (!tool.enabled) return t('capabilities.toolDisabled');
    if (tool.requiresConfig && !tool.configured) return t('capabilities.toolRequiresConfig');
    if (!tool.configured) return t('capabilities.toolIncomplete');
    return undefined;
  };

  const toToolOptions = (
    blockedSet: Set<string>,
    blockedReason: string
  ): CapabilityPolicyOption[] =>
    tools.map((tool) => {
      const disabledReason = blockedSet.has(tool.toolId)
        ? blockedReason
        : getToolAvailabilityReason(tool);
      return {
        id: tool.toolId,
        name: tool.label,
        internalName: tool.toolId,
        description: tool.description,
        disabled: Boolean(disabledReason),
        disabledReason,
      };
    });

  const toSkillOptions = (
    blockedSet: Set<string>,
    blockedReason: string
  ): CapabilityPolicyOption[] =>
    skills.map((skill) => {
      const disabledReason = blockedSet.has(skill.resourceId) ? blockedReason : undefined;
      return {
        id: skill.resourceId,
        name: skill.title,
        internalName: skill.skillName,
        description: skill.description,
        disabled: Boolean(disabledReason),
        disabledReason,
      };
    });

  // 允许和禁用 Tool 可以在两侧直接切换，提交时再从另一侧移除，避免默认全选后无法禁用。
  const allowToolOptions = toToolOptions(new Set(), '');
  const denyToolOptions = toToolOptions(new Set(), '');
  const onDemandSkillOptions = toSkillOptions(forceSkillSet, t('capabilities.alreadyForce'));
  const forceSkillOptions = toSkillOptions(onDemandSkillSet, t('capabilities.alreadyOnDemand'));

  const updatePolicy = (next: Partial<typeof policy>) => {
    onChange({ ...spec, toolAndSkillPolicy: { ...policy, ...next } });
  };

  return (
    <SectionShell
      id="capabilities"
      title={t('capabilities.title')}
      description={t('capabilities.description')}
    >
      <SettingRow
        title={t('capabilities.enableTool')}
        description={t('capabilities.enableToolDescription')}
        selected={policy.enableUseTool}
        disabled={disabled}
        onChange={(value) => updatePolicy({ enableUseTool: value })}
      />
      {policy.enableUseTool ? (
        <>
          <CapabilityPolicyPanel
            kind="tool"
            title={t('capabilities.allowTool')}
            description={t('capabilities.allowToolDescription')}
            addLabel={t('capabilities.addAllowTool')}
            searchPlaceholder={t('capabilities.searchTool')}
            emptyText={t('capabilities.noTool')}
            selectedEmptyText={t('capabilities.noSelectedTool')}
            options={allowToolOptions}
            selectedIds={defaultAllowedToolIds}
            disabled={disabled}
            onChange={(ids) =>
              updatePolicy({
                allowToolNames: ids,
                denyToolNames: policy.denyToolNames.filter((id) => !ids.includes(id)),
              })
            }
          />
          <CapabilityPolicyPanel
            kind="tool"
            title={t('capabilities.denyTool')}
            description={t('capabilities.denyToolDescription')}
            addLabel={t('capabilities.addDenyTool')}
            searchPlaceholder={t('capabilities.searchTool')}
            emptyText={t('capabilities.noTool')}
            selectedEmptyText={t('capabilities.noSelectedTool')}
            options={denyToolOptions}
            selectedIds={policy.denyToolNames}
            disabled={disabled}
            onChange={(ids) =>
              updatePolicy({
                denyToolNames: ids,
                allowToolNames: policy.allowToolNames.filter((id) => !ids.includes(id)),
              })
            }
          />
          <SettingRow
            title={t('capabilities.enableSkill')}
            description={t('capabilities.enableSkillDescription')}
            selected={policy.enableUseSkill}
            disabled={disabled}
            onChange={(value) => updatePolicy({ enableUseSkill: value })}
          />
          {policy.enableUseSkill ? (
            <>
              <CapabilityPolicyPanel
                kind="skill"
                title={t('capabilities.onDemandSkill')}
                description={t('capabilities.onDemandSkillDescription')}
                addLabel={t('capabilities.addOnDemandSkill')}
                searchPlaceholder={t('capabilities.searchSkill')}
                emptyText={t('capabilities.noSkill')}
                selectedEmptyText={t('capabilities.noSelectedSkill')}
                options={onDemandSkillOptions}
                selectedIds={policy.onDemandSkillIds}
                disabled={disabled}
                onChange={(ids) => updatePolicy({ onDemandSkillIds: ids })}
              />
              <CapabilityPolicyPanel
                kind="skill"
                title={t('capabilities.forceSkill')}
                description={t('capabilities.forceSkillDescription')}
                addLabel={t('capabilities.addForceSkill')}
                searchPlaceholder={t('capabilities.searchSkill')}
                emptyText={t('capabilities.noSkill')}
                selectedEmptyText={t('capabilities.noSelectedSkill')}
                options={forceSkillOptions}
                selectedIds={policy.forceEnabledSkillIds}
                disabled={disabled}
                onChange={(ids) => updatePolicy({ forceEnabledSkillIds: ids })}
              />
            </>
          ) : null}
        </>
      ) : null}
    </SectionShell>
  );
}
