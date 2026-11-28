import { Check, X } from 'lucide-react';

import { Checkbox } from '@/components/base/Input';
import { Tabs } from '@/components/base/Tabs';
import {
  resolveTagPermissionActionPresetKey,
  TAG_PERMISSION_ACTION_PRESET_OPTIONS,
  TAG_PERMISSION_ACTION_ROWS,
  TAG_PERMISSION_RESOURCE_STRATEGIES,
} from '@/components/business/Drive/_common/tagPermissionPreset';
import ResourcePermissionActionIcon from '@/components/business/Drive/ResourcePermissionActionIcon';
import { normalizeResourceActions, type ResourceAction } from '@/domains/_shared/access';
import {
  buildTagPermissionListActionSelectionPatch,
  isTagPermissionListActionSelected,
} from '@/domains/Tag';

import type { ActionPresetKey, TagPermissionActionEditorProps } from './index.type';
import styles from './style.module.scss';

type PresetTabKey = ActionPresetKey | 'custom';
const PRESET_TAB_KEYS: PresetTabKey[] = ['private', 'readonly', 'shared', 'custom'];

function TagPermissionActionEditor({
  ariaLabel,
  actions,
  isDisabled = false,
  labels,
  onActionsChange,
}: TagPermissionActionEditorProps) {
  const selectedPresetKey = resolveTagPermissionActionPresetKey(actions);

  const handlePresetChange = (presetKey: ActionPresetKey) => {
    const preset = TAG_PERMISSION_ACTION_PRESET_OPTIONS.find((item) => item.key === presetKey);
    if (!preset) return;
    onActionsChange(normalizeResourceActions(preset.values.grantedActions));
  };

  const handleActionToggle = (action: ResourceAction, checked: boolean) => {
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
        <Tabs
          variant="secondary"
          aria-label={labels.basedOnPreset}
          className={styles.presetTabs}
          selectedKey={selectedPresetKey}
          onSelectionChange={(key) => {
            if (key === 'custom' || isDisabled) return;
            handlePresetChange(String(key) as ActionPresetKey);
          }}
        >
          <Tabs.ListContainer className={styles.presetTabsListContainer}>
            <Tabs.List className={styles.presetTabsList} aria-label={labels.basedOnPreset}>
              {PRESET_TAB_KEYS.map((key) => (
                <Tabs.Tab key={key} id={key} className={styles.presetTab}>
                  {key === 'custom' ? labels.customPreset : labels.getPresetLabel(key)}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
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
                <tr key={row.action}>
                  <th className={styles.actionCell}>
                    <span className={styles.actionName}>
                      <ResourcePermissionActionIcon
                        action={row.action}
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
