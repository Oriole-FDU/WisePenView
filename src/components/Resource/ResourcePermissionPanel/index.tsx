import AppAvatar from '@/components/Avatar';
import AppIconButton from '@/components/Button/AppIconButton';
import ResourcePermissionActionIcon from '@/components/Drive/common/resourcePermissionActionIcon';
import { buildResourcePermissionActionKeySet } from '@/components/Drive/common/resourcePermissionPolicy';
import { AppPopover } from '@/components/Overlay';
import UserSearchCombobox from '@/components/UserSearchCombobox';
import {
  type ResourcePermissionActionOption,
  type ResourcePermissionSource,
  type ResourcePermissionSubject,
} from '@/domains/Resource';
import { parseErrorMessage } from '@/utils/error';
import { Button, Chip, ListBox, Skeleton } from '@heroui/react';
import type { TFunction } from 'i18next';
import { ChevronDown, Trash2, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ResourcePermissionPanelProps } from './index.type';
import {
  getAvatarSrc,
  getSubjectActionsForDisplay,
  getSubjectRenderKey,
} from './resourcePermissionPanelModel';
import styles from './style.module.less';
import { useResourcePermissionPanelController } from './useResourcePermissionPanelController';

interface SubjectPermissionPopoverProps {
  subject: ResourcePermissionSubject;
  actionOptions: ResourcePermissionActionOption[];
  onActionToggle: (
    subject: ResourcePermissionSubject,
    action: ResourcePermissionActionOption['action']
  ) => void;
}

const sourceLabelKeyMap: Record<ResourcePermissionSource, string> = {
  owner: 'permission.source.owner',
  tag: 'permission.source.tag',
  resourceOverride: 'permission.source.resourceOverride',
  specifiedUser: 'permission.source.specifiedUser',
};
const PANEL_SKELETON_ROWS = ['owner', 'tag', 'override', 'specifiedUser'] as const;

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getActionLabel = (
  action: ResourcePermissionActionOption['action'],
  options: ResourcePermissionActionOption[]
): string => options.find((option) => option.action === action)?.label ?? String(action);

const formatActionSummary = (
  subject: ResourcePermissionSubject,
  options: ResourcePermissionActionOption[],
  t: TFunction<'resource'>
): string => {
  if (subject.source === 'owner') return t('permission.summary.all');
  if (subject.source === 'tag') return t('permission.summary.inherited');
  const actions = subject.effectiveActions;
  if (actions.length === 0) {
    return t('permission.summary.none');
  }
  const first = actions[0];
  return t('permission.summary.multiple', {
    first: getActionLabel(first, options),
    count: actions.length,
  });
};

function SubjectPermissionPopover({
  subject,
  actionOptions,
  onActionToggle,
}: SubjectPermissionPopoverProps) {
  const { t } = useTranslation('resource');
  const selectedActionKeys = buildResourcePermissionActionKeySet(
    getSubjectActionsForDisplay(subject),
    actionOptions
  );
  const trigger = (
    <Button
      variant="ghost"
      size="sm"
      className={styles.permissionButton}
      isDisabled={subject.readonly || actionOptions.length === 0}
      aria-label={t('permission.subjectAria', { name: subject.name })}
    >
      <span className={styles.permissionTriggerText}>
        {formatActionSummary(subject, actionOptions, t)}
      </span>
      {!subject.readonly && actionOptions.length > 0 ? (
        <ChevronDown size={14} aria-hidden className={styles.permissionChevron} />
      ) : null}
    </Button>
  );

  if (subject.readonly || actionOptions.length === 0) {
    return trigger;
  }

  return (
    <AppPopover deferContent={false}>
      <AppPopover.Trigger>{trigger}</AppPopover.Trigger>
      <AppPopover.Content
        className={styles.permissionPopover}
        placement="bottom end"
        bodyPadding="none"
      >
        <ListBox
          aria-label={t('permission.optionsAria', { name: subject.name })}
          selectionMode="multiple"
          selectedKeys={selectedActionKeys}
          className={styles.actionList}
        >
          {actionOptions.map((option) => (
            <ListBox.Item
              id={option.key}
              key={option.key}
              textValue={option.label}
              onPress={() => onActionToggle(subject, option.action)}
            >
              <span className={styles.actionLabel}>
                <ResourcePermissionActionIcon
                  action={option.action}
                  className={styles.actionIcon}
                />
                <span className={styles.actionText}>{option.label}</span>
              </span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </AppPopover.Content>
    </AppPopover>
  );
}

function PermissionPanelSkeleton() {
  const { t } = useTranslation('resource');
  return (
    <div className={styles.skeletonShell} aria-label={t('permission.loadingAria')}>
      <div className={styles.skeletonList}>
        {PANEL_SKELETON_ROWS.map((row) => (
          <div key={row} className={styles.skeletonItem}>
            <Skeleton className={styles.skeletonAvatar} />
            <div className={styles.skeletonMeta}>
              <Skeleton className={styles.skeletonName} />
              <Skeleton className={styles.skeletonDescription} />
            </div>
            <Skeleton className={styles.skeletonAction} />
          </div>
        ))}
      </div>
      <div className={styles.skeletonAddRow}>
        <Skeleton className={styles.skeletonInput} />
        <Skeleton className={styles.skeletonAddButton} />
      </div>
    </div>
  );
}

function ResourcePermissionPanel({
  resourceId,
  resourceType,
  onSuccess,
}: ResourcePermissionPanelProps) {
  const { t } = useTranslation('resource');
  const {
    actionOptions,
    addSpecifiedUserCandidate,
    error,
    existingSpecifiedUserIds,
    handleActionToggle,
    handleRemoveSpecifiedUser,
    handleUserSearchEmpty,
    handleUserSearchError,
    inheritedSubjects,
    isUpdating,
    loading,
    newUserKeyword,
    permissionOverview,
    queryUserCandidates,
    setNewUserKeyword,
    shouldShowInviteDivider,
    specifiedUserSubjects,
  } = useResourcePermissionPanelController({ resourceId, resourceType, onSuccess });

  const renderSubjectItem = (subject: ResourcePermissionSubject) => {
    const avatarSrc = getAvatarSrc(subject.avatar);
    const baseSubjectName =
      subject.kind === 'owner' && !subject.name
        ? t('permission.source.owner')
        : subject.kind === 'user' && (!subject.name || subject.name === subject.userId)
          ? t('permission.userFallback', { userId: subject.userId })
          : subject.kind === 'group' && (!subject.name || subject.name === subject.groupId)
            ? t('permission.groupFallback', { groupId: subject.groupId })
            : subject.name;
    const subjectName =
      subject.kind === 'group'
        ? t('permission.groupMembers', { groupName: baseSubjectName })
        : baseSubjectName;
    const displaySubject =
      subjectName === subject.name ? subject : { ...subject, name: subjectName };
    const description =
      subject.source === 'owner'
        ? t('permission.source.owner')
        : subject.source === 'tag'
          ? t('permission.description.inheritedFromTag')
          : subject.source === 'specifiedUser'
            ? t('permission.description.invitedByYou')
            : subject.source === 'resourceOverride' && !subject.description
              ? t('permission.description.resourceOverride')
              : subject.description;

    return (
      <div key={getSubjectRenderKey(subject)} role="listitem" className={styles.subjectItem}>
        <div className={styles.subjectContent}>
          <AppAvatar aria-label={subjectName} className={styles.avatar}>
            {avatarSrc ? <AppAvatar.Image alt={subjectName} src={avatarSrc} /> : null}
            <AppAvatar.Fallback>{getDisplayInitial(subjectName)}</AppAvatar.Fallback>
          </AppAvatar>
          <div className={styles.subjectMeta}>
            <div className={styles.subjectNameRow}>
              <span className={styles.subjectName}>{subjectName}</span>
              <Chip size="sm" variant="soft" className={styles.sourceChip}>
                <Chip.Label>{t(sourceLabelKeyMap[subject.source])}</Chip.Label>
              </Chip>
            </div>
            {description ? <span className={styles.subjectDescription}>{description}</span> : null}
          </div>
          <div className={styles.subjectActions}>
            <SubjectPermissionPopover
              subject={displaySubject}
              actionOptions={actionOptions}
              onActionToggle={handleActionToggle}
            />
            {subject.source === 'specifiedUser' ? (
              <AppIconButton
                icon={<Trash2 size={16} aria-hidden />}
                label={t('permission.removeCollaborator')}
                size="sm"
                variant="danger"
                onPress={() => handleRemoveSpecifiedUser(subject)}
              />
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.panel} aria-busy={isUpdating || undefined}>
      <div className={styles.panelBody}>
        {loading ? (
          <PermissionPanelSkeleton />
        ) : error ? (
          <div className={styles.stateText}>{parseErrorMessage(error)}</div>
        ) : permissionOverview ? (
          <div className={styles.shell}>
            <section className={styles.subjectPane} aria-label={t('permission.collaborator')}>
              <div
                className={styles.subjectList}
                role="list"
                aria-label={t('permission.collaboratorSources')}
              >
                {inheritedSubjects.map(renderSubjectItem)}
                {shouldShowInviteDivider ? (
                  <div className={styles.inviteDivider} aria-hidden />
                ) : null}
                {specifiedUserSubjects.map(renderSubjectItem)}
              </div>
              <div className={styles.addRow}>
                <UserSearchCombobox
                  value={newUserKeyword}
                  onValueChange={setNewUserKeyword}
                  onSelect={addSpecifiedUserCandidate}
                  onEmptySubmit={handleUserSearchEmpty}
                  onError={handleUserSearchError}
                  queryUsers={queryUserCandidates}
                  excludedUserIds={existingSpecifiedUserIds}
                  placeholder={t('permission.userPlaceholder')}
                  ariaLabel={t('permission.userInputAria')}
                  submitIcon={<UserPlus size={16} aria-hidden />}
                  submitLabel={t('permission.addCollaborator')}
                />
              </div>
            </section>
          </div>
        ) : (
          <div className={styles.stateText}>{t('permission.empty')}</div>
        )}
      </div>
    </div>
  );
}

export default ResourcePermissionPanel;
