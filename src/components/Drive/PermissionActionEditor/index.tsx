import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import {
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  TAG_PERMISSION_ACTION_ROWS,
  TAG_PERMISSION_RESOURCE_STRATEGIES,
  type TagPermissionResourceStrategy,
} from '@/components/Drive/common/tagPermissionPreset';
import {
  buildTagPermissionListActionSelectionPatch,
  isTagPermissionListActionSelected,
  normalizeResourceActions,
  type TagPermissionListAction,
  type TagPermissionPresetKey,
  type TagResourceAction,
} from '@/domains/Tag';
import { Button, Checkbox } from '@heroui/react';
import { Check, X } from 'lucide-react';
import styles from './style.module.less';

type ActionPresetKey = Exclude<TagPermissionPresetKey, 'custom'>;

interface TagPermissionActionEditorProps {
  ariaLabel: string;
  actions: TagResourceAction[];
  isDisabled?: boolean;
  labels: {
    actionHeader: string;
    applicable: (strategy: TagPermissionResourceStrategy) => string;
    basedOnPreset: string;
    currentPreset: (preset: string) => string;
    customPreset: string;
    disabled: (strategy: TagPermissionResourceStrategy, action: string) => string;
    enabled: (strategy: TagPermissionResourceStrategy, action: string) => string;
    getActionLabel: (action: TagPermissionListAction) => string;
    getPresetLabel: (preset: ActionPresetKey) => string;
    toggleHeader: string;
  };
  onActionsChange: (actions: TagResourceAction[]) => void;
}

function isSameActionSet(left: TagResourceAction[], right: TagResourceAction[]): boolean {
  const leftSet = new Set(normalizeResourceActions(left));
  const rightSet = new Set(normalizeResourceActions(right));
  if (leftSet.size !== rightSet.size) return false;
  return [...leftSet].every((action) => rightSet.has(action));
}

function resolveActionPresetKey(actions: TagResourceAction[]): ActionPresetKey | 'custom' {
  const matchedPreset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((preset) =>
    isSameActionSet(preset.values.grantedActions, actions)
  );
  return matchedPreset?.key ?? 'custom';
}

function TagPermissionActionEditor({
  ariaLabel,
  actions,
  isDisabled = false,
  labels,
  onActionsChange,
}: TagPermissionActionEditorProps) {
  const selectedPresetKey = resolveActionPresetKey(actions);
  const selectedPresetLabel =
    selectedPresetKey === 'custom' ? labels.customPreset : labels.getPresetLabel(selectedPresetKey);

  const handlePresetChange = (presetKey: ActionPresetKey) => {
    const preset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((item) => item.key === presetKey);
    if (!preset) return;
    onActionsChange(normalizeResourceActions(preset.values.grantedActions));
  };

  const handleActionToggle = (action: TagPermissionListAction, checked: boolean) => {
    if (isDisabled) return;
    const patch = buildTagPermissionListActionSelectionPatch(
      { grantedActions: actions },
      action,
      checked
    );
    onActionsChange(normalizeResourceActions(patch.grantedActions));
  };

  return (
    <section className={styles.permissionCard} aria-label={ariaLabel}>
      <div className={styles.presetBar}>
        <span className={styles.presetLabel}>{labels.basedOnPreset}</span>
        <div className={styles.presetButtons} role="group" aria-label={labels.basedOnPreset}>
          {TAG_PERMISSION_ACTION_PRESET_OPTIONS.map((preset) => (
            <Button
              key={preset.key}
              variant={selectedPresetKey === preset.key ? 'primary' : 'secondary'}
              size="sm"
              isDisabled={isDisabled}
              onPress={() => handlePresetChange(preset.key)}
            >
              {labels.getPresetLabel(preset.key)}
            </Button>
          ))}
        </div>
        <span className={styles.currentPreset}>{labels.currentPreset(selectedPresetLabel)}</span>
      </div>

      <div className={styles.permissionTableShell}>
        <table className={styles.permissionTable}>
          <thead>
            <tr>
              <th className={styles.actionHeader}>{labels.actionHeader}</th>
              <th className={styles.toggleHeader}>{labels.toggleHeader}</th>
              {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => (
                <th key={strategy.key} className={styles.resourceApplicabilityHeader}>
                  {labels.applicable(strategy)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAG_PERMISSION_ACTION_ROWS.map((row) => {
              const actionLabel = labels.getActionLabel(row.action);
              const selected = isTagPermissionListActionSelected(
                { grantedActions: actions },
                row.action
              );
              return (
                <tr key={row.key}>
                  <th className={styles.actionCell}>
                    <span className={styles.actionName}>
                      <ResourcePermissionActionIcon
                        action={row.action.action}
                        className={styles.actionIcon}
                      />
                      <span className={styles.actionText}>{actionLabel}</span>
                    </span>
                  </th>
                  <td
                    className={styles.permissionToggleCell}
                    onClick={() => handleActionToggle(row.action, !selected)}
                  >
                    <Checkbox
                      className={styles.permissionCheckbox}
                      aria-label={actionLabel}
                      isDisabled={isDisabled}
                      isSelected={selected}
                      onChange={(isSelected) => handleActionToggle(row.action, isSelected)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  </td>
                  {TAG_PERMISSION_RESOURCE_STRATEGIES.map((strategy) => {
                    const supported = row.supportedStrategyKeys.includes(strategy.key);
                    const cellClassName = !supported
                      ? styles.unsupportedCell
                      : selected
                        ? styles.supportedCell
                        : styles.deniedCell;
                    return (
                      <td key={strategy.key} className={cellClassName}>
                        {!supported ? (
                          <span aria-hidden="true">-</span>
                        ) : selected ? (
                          <Check
                            size={14}
                            aria-label={labels.enabled(strategy, actionLabel)}
                            className={styles.permissionStateIcon}
                          />
                        ) : (
                          <X
                            size={14}
                            aria-label={labels.disabled(strategy, actionLabel)}
                            className={styles.permissionStateIcon}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default TagPermissionActionEditor;
