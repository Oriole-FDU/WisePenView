import { Input, TextArea, UploadZone } from '@/components/Input';
import AppModal from '@/components/Overlay/AppModal';
import { useGroupService, useImageService } from '@/domains';
import { GROUP_TYPE, type EditGroupRequest, type Group } from '@/domains/Group';
import { parseErrorMessage } from '@/utils/error';
import { formatTimestampToDate } from '@/utils/format/formatTime';
import { PLACEHOLDER_IMAGE } from '@/utils/image/placeholder';
import { assertImageProxyUploadLimit } from '@/utils/image/uploadLimit';
import { Button, Label, TextField, toast, Tooltip } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Pencil } from 'lucide-react';
import { useRef, useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import GroupSettingsSection from '../GroupSettingsSection';
import styles from './style.module.less';

interface GroupProfileSectionProps {
  group: Group;
  groupId: string;
  canEdit: boolean;
  onSuccess: () => void;
}

interface GroupProfileDraft {
  groupName: string;
  groupDesc: string;
  coverFile: File | null;
  coverPreview: string | null;
}

const buildProfileDraft = (group: Group): GroupProfileDraft => ({
  groupName: group.groupName,
  groupDesc: group.groupDesc,
  coverFile: null,
  coverPreview: null,
});

function GroupProfileSection({ group, groupId, canEdit, onSuccess }: GroupProfileSectionProps) {
  const { t } = useTranslation(['group', 'common']);
  const groupService = useGroupService();
  const imageService = useImageService();
  const [draft, setDraft] = useState<GroupProfileDraft>(() => buildProfileDraft(group));
  const [savedDraft, setSavedDraft] = useState<GroupProfileDraft>(() => buildProfileDraft(group));
  const [coverModalOpen, setCoverModalOpen] = useState(false);
  const [modalCoverFile, setModalCoverFile] = useState<File | null>(null);
  const coverPreviewRequestRef = useRef(0);

  const { loading: saving, run: runSave } = useRequest(
    async (nextDraft: GroupProfileDraft): Promise<GroupProfileDraft> => {
      let groupCoverUrl = group.groupCoverUrl;
      if (nextDraft.coverFile) {
        const { publicUrl } = await imageService.uploadImage({
          file: nextDraft.coverFile,
          scene: 'PUBLIC_IMAGE_FOR_GROUP',
          bizTag: `groups/${groupId}`,
        });
        groupCoverUrl = publicUrl;
      }

      const params: EditGroupRequest = {
        groupId,
        groupName: nextDraft.groupName,
        groupDesc: nextDraft.groupDesc,
        groupCoverUrl,
        groupMetaInfo: group.groupMetaInfo,
        groupType: group.groupType,
      };
      await groupService.editGroup(params);
      return {
        groupName: params.groupName,
        groupDesc: params.groupDesc,
        coverFile: null,
        coverPreview: groupCoverUrl || null,
      };
    },
    {
      manual: true,
      onSuccess: (nextSavedDraft) => {
        coverPreviewRequestRef.current += 1;
        setSavedDraft(nextSavedDraft);
        setDraft(nextSavedDraft);
        toast.success(
          group.groupType === GROUP_TYPE.ADVANCED ? t('profile.course.saved') : t('profile.saved')
        );
        onSuccess();
      },
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const updateDraft = <K extends keyof GroupProfileDraft>(key: K, value: GroupProfileDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleRestore = () => {
    coverPreviewRequestRef.current += 1;
    setDraft(savedDraft);
  };

  const handleCoverModalOpen = () => {
    setModalCoverFile(null);
    setCoverModalOpen(true);
  };

  const handleCoverModalOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setModalCoverFile(null);
      setCoverModalOpen(false);
      return;
    }
    setCoverModalOpen(true);
  };

  const handleModalCoverFileChange = (file: File | null) => {
    if (!file) {
      setModalCoverFile(null);
      return;
    }

    try {
      assertImageProxyUploadLimit(file);
      setModalCoverFile(file);
    } catch (error) {
      toast.danger(parseErrorMessage(error));
      setModalCoverFile(null);
    }
  };

  const handleConfirmCover = () => {
    if (!modalCoverFile) {
      toast.warning(selectCover);
      return;
    }

    const requestId = coverPreviewRequestRef.current + 1;
    coverPreviewRequestRef.current = requestId;
    const reader = new FileReader();
    reader.onload = () => {
      if (requestId !== coverPreviewRequestRef.current || typeof reader.result !== 'string') return;
      updateDraft('coverPreview', reader.result);
    };
    reader.readAsDataURL(modalCoverFile);
    updateDraft('coverFile', modalCoverFile);
    setModalCoverFile(null);
    setCoverModalOpen(false);
  };

  const handleSave = () => {
    const groupName = draft.groupName.trim();
    if (!groupName) {
      toast.warning(
        group.groupType === GROUP_TYPE.ADVANCED
          ? t('profile.course.nameRequired')
          : t('create.nameRequired')
      );
      return;
    }
    runSave({ ...draft, groupName, groupDesc: draft.groupDesc.trim() });
  };

  const handleCoverImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== PLACEHOLDER_IMAGE) {
      event.currentTarget.src = PLACEHOLDER_IMAGE;
    }
  };

  const coverUrl = draft.coverPreview ?? group.groupCoverUrl ?? PLACEHOLDER_IMAGE;
  const ownerName = group.ownerInfo?.realName?.trim() || group.ownerInfo?.nickname?.trim() || '-';
  const createDate = formatTimestampToDate(group.createTime) || t('detail.noDate');
  const isCourseGroup = group.groupType === GROUP_TYPE.ADVANCED;
  const profileTitle = isCourseGroup ? t('profile.course.title') : t('profile.title');
  const nameLabel = isCourseGroup ? t('profile.course.name') : t('fields.name');
  const descriptionLabel = isCourseGroup
    ? t('profile.course.description')
    : t('fields.description');
  const coverLabel = isCourseGroup ? t('profile.course.cover') : t('profile.cover');
  const namePlaceholder = isCourseGroup
    ? t('profile.course.namePlaceholder')
    : t('fields.namePlaceholder');
  const descriptionPlaceholder = isCourseGroup
    ? t('profile.course.descriptionPlaceholder')
    : t('fields.descriptionPlaceholder');
  const changeCover = isCourseGroup ? t('profile.course.changeCover') : t('profile.changeCover');
  const changeCoverShort = isCourseGroup
    ? t('profile.course.changeCoverShort')
    : t('profile.changeCoverShort');
  const selectCover = isCourseGroup ? t('profile.course.selectCover') : t('profile.selectCover');
  const noDescription = isCourseGroup
    ? t('profile.course.noDescription')
    : t('profile.noDescription');

  return (
    <>
      <GroupSettingsSection title={t('profile.creationInfo')} compact>
        <div className={styles.profileMeta}>
          <span>
            {t('detail.creator')}
            {ownerName}
          </span>
          <span>{t('detail.createdAt', { date: createDate })}</span>
        </div>
      </GroupSettingsSection>
      <GroupSettingsSection
        title={profileTitle}
        actions={
          canEdit ? (
            <>
              <Button variant="secondary" isDisabled={saving} onPress={handleRestore}>
                {t('profile.restore')}
              </Button>
              <Button
                variant="primary"
                isDisabled={saving}
                aria-busy={saving || undefined}
                onPress={handleSave}
              >
                {t('actions.save', { ns: 'common' })}
              </Button>
            </>
          ) : undefined
        }
      >
        <div className={styles.profileLayout}>
          <div className={styles.fields}>
            {canEdit ? (
              <>
                <TextField
                  aria-label={nameLabel}
                  value={draft.groupName}
                  onChange={(value) => updateDraft('groupName', value)}
                  isRequired
                >
                  <Label>{nameLabel}</Label>
                  <Input placeholder={namePlaceholder} />
                </TextField>
                <TextField
                  aria-label={descriptionLabel}
                  value={draft.groupDesc}
                  onChange={(value) => updateDraft('groupDesc', value)}
                >
                  <Label>{descriptionLabel}</Label>
                  <TextArea
                    rows={5}
                    className={styles.descriptionTextArea}
                    placeholder={descriptionPlaceholder}
                  />
                </TextField>
              </>
            ) : (
              <dl className={styles.readonlyFields}>
                <div>
                  <dt>{nameLabel}</dt>
                  <dd>{group.groupName || '-'}</dd>
                </div>
                <div>
                  <dt>{descriptionLabel}</dt>
                  <dd>{group.groupDesc || noDescription}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className={styles.coverField}>
            <span className={styles.coverLabel}>{coverLabel}</span>
            {canEdit ? (
              <Tooltip>
                <Tooltip.Trigger>
                  <button
                    className={styles.coverButton}
                    type="button"
                    aria-label={changeCover}
                    disabled={saving}
                    onClick={handleCoverModalOpen}
                  >
                    <img
                      className={styles.coverImage}
                      src={coverUrl}
                      alt={
                        isCourseGroup
                          ? t('profile.course.coverAlt', {
                              name: draft.groupName || group.groupName,
                            })
                          : t('profile.coverAlt', {
                              name: draft.groupName || group.groupName,
                            })
                      }
                      onError={handleCoverImageError}
                    />
                    <span className={styles.coverEditAffordance}>
                      <Pencil size={16} aria-hidden="true" />
                    </span>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>{changeCoverShort}</Tooltip.Content>
              </Tooltip>
            ) : (
              <div className={styles.coverReadonly}>
                <img
                  className={styles.coverImage}
                  src={coverUrl}
                  alt={
                    isCourseGroup
                      ? t('profile.course.coverAlt', { name: group.groupName })
                      : t('profile.coverAlt', { name: group.groupName })
                  }
                  onError={handleCoverImageError}
                />
              </div>
            )}
          </div>
        </div>
      </GroupSettingsSection>

      <AppModal
        isOpen={coverModalOpen}
        onOpenChange={handleCoverModalOpenChange}
        title={changeCover}
        isDismissable={!saving}
        actions={
          <>
            <Button
              variant="secondary"
              isDisabled={saving}
              onPress={() => handleCoverModalOpenChange(false)}
            >
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button
              variant="primary"
              isDisabled={!modalCoverFile || saving}
              onPress={handleConfirmCover}
            >
              {t('actions.confirm', { ns: 'common' })}
            </Button>
          </>
        }
      >
        <UploadZone
          file={modalCoverFile}
          disabled={saving}
          accept="image/*"
          label={t('fields.coverUpload')}
          onFileChange={handleModalCoverFileChange}
        />
      </AppModal>
    </>
  );
}

export default GroupProfileSection;
