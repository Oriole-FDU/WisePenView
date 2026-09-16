import { toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { FormField, Input, TextArea } from '@/components/base/Input';
import AppFormDialog from '@/components/business/AppFormDialog';
import { useAgentService, useDriveService, useNoteService, useSkillService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';
import { validateReservedName } from '@/utils/tag/validateReservedName';

import type { DriveCreateModalProps } from './index.type';
import styles from './style.module.less';

function DriveCreateModal({
  type,
  isOpen,
  parent,
  pathTagId,
  parentLabel,
  existingFolderNames = [],
  onOpenChange,
  onSuccess,
}: DriveCreateModalProps) {
  const { t } = useTranslation(['drive', 'common']);
  const agentService = useAgentService();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const skillService = useSkillService();
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [titleError, setTitleError] = useState('');

  const reset = () => {
    setTitle('');
    setName('');
    setDescription('');
    setTitleError('');
  };

  const { loading, run: runCreate } = useApi(
    async () => {
      let createdId: string;
      switch (type) {
        case 'agent':
          createdId = await agentService.createAgent(
            title.trim(),
            name.trim() || undefined,
            description.trim() || undefined,
            pathTagId
          );
          break;
        case 'drawio': {
          const result = await noteService.createNote({
            title: title.trim() || t('create.defaultDrawioTitle'),
            resourceType: 'DRAWIO',
            pathTagId,
          });
          if (!result.resourceId) {
            throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
          }
          createdId = result.resourceId;
          break;
        }
        case 'folder':
          if (!parent) {
            throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
              reason: t('create.targetMissing'),
            });
          }
          createdId = (await driveService.createFolder({ parent, name: title.trim() })).tagId;
          break;
        case 'skill':
          createdId = await skillService.createSkill(
            title.trim(),
            name.trim() || undefined,
            description.trim() || undefined,
            pathTagId
          );
          break;
      }
      await onSuccess(createdId, type);
    },
    {
      manual: true,
      onSuccess: () => {
        if (type === 'folder') toast.success(t('create.success'));
        reset();
      },
    }
  );

  const handleSubmit = () => {
    switch (type) {
      case 'folder': {
        const trimmed = title.trim();
        if (!trimmed) {
          setTitleError(t('create.validation.folderRequired'));
          return;
        }
        const validation = validateReservedName(trimmed);
        if (!validation.valid) {
          setTitleError(t('create.validation.reservedPrefix'));
          return;
        }
        if (existingFolderNames.includes(trimmed)) {
          setTitleError(t('create.validation.duplicateFolder'));
          return;
        }
        runCreate();
        break;
      }
      case 'agent':
      case 'skill':
        if (title.trim()) runCreate();
        break;
      case 'drawio':
        runCreate();
        break;
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) reset();
    onOpenChange(open);
  };

  switch (type) {
    case 'folder':
      return (
        <AppFormDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title={t('create.folder')}
          confirmText={t('actions.create', { ns: 'common' })}
          onSubmit={handleSubmit}
          isSubmitting={loading}
          isDismissable={!loading}
        >
          <div className={styles.pathHint}>
            {parentLabel
              ? t('create.createUnder', { parent: parentLabel })
              : t('create.currentDirectory')}
          </div>
          <FormField
            aria-label={t('create.folderName')}
            label={t('create.folderName')}
            value={title}
            onChange={(value) => {
              setTitle(value);
              setTitleError('');
            }}
            errorMessage={titleError}
            isRequired
          >
            <Input placeholder={t('create.folderPlaceholder')} autoFocus />
          </FormField>
        </AppFormDialog>
      );
    case 'drawio':
      return (
        <AppFormDialog
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title={t('create.drawio')}
          confirmText={t('actions.create', { ns: 'common' })}
          onSubmit={handleSubmit}
          isSubmitting={loading}
          isDismissable={!loading}
        >
          <FormField
            aria-label={t('create.drawioName')}
            label={t('create.drawioName')}
            value={title}
            onChange={setTitle}
          >
            <Input placeholder={t('create.defaultDrawioTitle')} autoFocus />
          </FormField>
        </AppFormDialog>
      );
    case 'agent':
      return (
        <AppModal
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title={t('create.asset.agentTitle')}
          size="lg"
          isDismissable={!loading}
          actions={
            <>
              <AppButton
                variant="secondary"
                isDisabled={loading}
                onPress={() => handleOpenChange(false)}
              >
                {t('actions.cancel', { ns: 'common' })}
              </AppButton>
              <AppButton
                variant="primary"
                isDisabled={!title.trim() || loading}
                aria-busy={loading || undefined}
                onPress={handleSubmit}
              >
                {t('actions.create', { ns: 'common' })}
              </AppButton>
            </>
          }
        >
          <div className={styles.form}>
            <FormField
              aria-label={t('create.asset.displayName')}
              label={t('create.asset.displayName')}
              value={title}
              onChange={setTitle}
              isRequired
            >
              <Input autoFocus placeholder={t('create.asset.agentDisplayPlaceholder')} />
            </FormField>
            <FormField
              aria-label={t('create.asset.agentName')}
              label={t('create.asset.agentName')}
              value={name}
              onChange={setName}
            >
              <Input placeholder="course_research_assistant" />
            </FormField>
            <FormField
              aria-label={t('create.asset.description')}
              label={t('create.asset.description')}
              value={description}
              onChange={setDescription}
            >
              <TextArea rows={3} placeholder={t('create.asset.agentDescriptionPlaceholder')} />
            </FormField>
          </div>
        </AppModal>
      );
    case 'skill':
      return (
        <AppModal
          isOpen={isOpen}
          onOpenChange={handleOpenChange}
          title={t('create.asset.skillTitle')}
          size="lg"
          isDismissable={!loading}
          actions={
            <>
              <AppButton
                variant="secondary"
                isDisabled={loading}
                onPress={() => handleOpenChange(false)}
              >
                {t('actions.cancel', { ns: 'common' })}
              </AppButton>
              <AppButton
                variant="primary"
                isDisabled={!title.trim() || loading}
                aria-busy={loading || undefined}
                onPress={handleSubmit}
              >
                {t('actions.create', { ns: 'common' })}
              </AppButton>
            </>
          }
        >
          <div className={styles.form}>
            <FormField
              aria-label={t('create.asset.displayName')}
              label={t('create.asset.displayName')}
              value={title}
              onChange={setTitle}
              isRequired
            >
              <Input autoFocus placeholder={t('create.asset.skillDisplayPlaceholder')} />
            </FormField>
            <FormField
              aria-label={t('create.asset.skillName')}
              label={t('create.asset.skillName')}
              value={name}
              onChange={setName}
            >
              <Input placeholder="paper_reading_assistant" />
            </FormField>
            <FormField
              aria-label={t('create.asset.description')}
              label={t('create.asset.description')}
              value={description}
              onChange={setDescription}
            >
              <TextArea rows={3} placeholder={t('create.asset.skillDescriptionPlaceholder')} />
            </FormField>
          </div>
        </AppModal>
      );
  }
}

export default DriveCreateModal;
