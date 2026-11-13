import { clsx } from 'clsx';
import { ArrowLeft, Bot, ChevronRight, FileInput, PenLine, Workflow, Wrench } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton, AppPressable } from '@/components/base/Button';
import { FormField, HiddenFileInput, Input } from '@/components/base/Input';
import { useMarkdownNoteImport } from '@/components/editors/note/hooks/useMarkdownNoteImport';
import { useAgentService, useDriveService, useNoteService, useSkillService } from '@/domains';
import { useApi } from '@/hooks/useApi';
import { createClientError, FRONTEND_CLIENT_ERROR } from '@/utils/error';

import type {
  CreatedResource,
  CreateResourceModalProps,
  CreateResourceType,
  ResourceRoot,
} from './index.type';
import styles from './style.module.scss';

interface ResourceOption {
  type: CreateResourceType;
  title: string;
  description: string;
  icon: typeof PenLine;
}

type CreateStep = 'select' | 'form';
type SlideDirection = 'forward' | 'back';

interface CreateResourceRequest {
  type: CreateResourceType;
  title: string;
  root: ResourceRoot;
}

function CreateResourceModal({ isOpen, onOpenChange, onCreated }: CreateResourceModalProps) {
  const { t } = useTranslation(['shell', 'drive', 'common']);
  const agentService = useAgentService();
  const driveService = useDriveService();
  const noteService = useNoteService();
  const skillService = useSkillService();
  const [step, setStep] = useState<CreateStep>('select');
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('forward');
  const [selectedType, setSelectedType] = useState<CreateResourceType>();
  const [title, setTitle] = useState('');
  const filenameInputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const options: ResourceOption[] = [
    {
      type: 'note',
      title: t('create.note', { ns: 'drive' }),
      description: t('resourceCreate.noteDescription'),
      icon: PenLine,
    },
    {
      type: 'drawio',
      title: t('create.drawio', { ns: 'drive' }),
      description: t('resourceCreate.drawioDescription'),
      icon: Workflow,
    },
    {
      type: 'skill',
      title: t('create.skill', { ns: 'drive' }),
      description: t('resourceCreate.skillDescription'),
      icon: Wrench,
    },
    {
      type: 'agent',
      title: t('create.agent', { ns: 'drive' }),
      description: t('resourceCreate.agentDescription'),
      icon: Bot,
    },
  ];
  const selectedOption = options.find((option) => option.type === selectedType);
  const {
    data: root,
    loading: rootLoading,
    hasError: rootHasError,
    refresh: retryRoot,
  } = useApi(
    async (): Promise<ResourceRoot> => {
      const result = await driveService.getRoot();
      if (!result.canMountResources || !result.tagId) {
        throw createClientError(FRONTEND_CLIENT_ERROR.INTERNAL_STATE, {
          reason: '个人云盘根目录不可挂载资源',
        });
      }
      return {
        ...result,
        tagId: result.tagId,
        canMountResources: true,
      };
    },
    {
      ready: isOpen,
      refreshDeps: [isOpen, driveService],
    }
  );

  const reset = () => {
    setStep('select');
    setSlideDirection('forward');
    setSelectedType(undefined);
    setTitle('');
  };

  const { loading: submitting, run: runCreate } = useApi(
    async ({ type, title: resourceTitle, root: resourceRoot }: CreateResourceRequest) => {
      let resourceId: string;
      switch (type) {
        case 'note': {
          const result = await noteService.createNote({
            title: resourceTitle,
            pathTagId: resourceRoot.tagId,
          });
          if (!result.resourceId) {
            throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
          }
          resourceId = result.resourceId;
          break;
        }
        case 'drawio': {
          const result = await noteService.createNote({
            title: resourceTitle,
            resourceType: 'DRAWIO',
            pathTagId: resourceRoot.tagId,
          });
          if (!result.resourceId) {
            throw createClientError(FRONTEND_CLIENT_ERROR.NOTE_CREATE_RESOURCE_ID_MISSING);
          }
          resourceId = result.resourceId;
          break;
        }
        case 'skill':
          resourceId = await skillService.createSkill(
            resourceTitle,
            undefined,
            undefined,
            resourceRoot.tagId
          );
          break;
        case 'agent':
          resourceId = await agentService.createAgent(
            resourceTitle,
            undefined,
            undefined,
            resourceRoot.tagId
          );
          break;
      }
      return { resourceId, type, root: resourceRoot } satisfies CreatedResource;
    },
    {
      manual: true,
      onSuccess: (resource) => {
        reset();
        onCreated(resource);
      },
    }
  );

  const {
    fileInputRef: markdownFileInputRef,
    importing,
    openFilePicker: openMarkdownFilePicker,
    handleFileChange: handleMarkdownFileChange,
  } = useMarkdownNoteImport({
    getPathTagId: () => root?.tagId,
    onSuccess: ({ resourceId }) => {
      if (!root) return;
      reset();
      onCreated({ resourceId, type: 'note', root });
    },
  });

  const busy = submitting || importing;
  const canSubmit = Boolean(selectedType && title.trim() && root && !busy);

  /**
   * @wisepen-manual-effect
   * 执行时机：滑入表单步骤后，在下一帧将焦点移到文件名输入框。
   * 不可替代原因：焦点是浏览器 DOM 状态，且需要等待步骤切换和入场动画开始。
   * cleanup：取消尚未执行的 animation frame，避免返回选择页后重新抢焦点。
   */
  useEffect(() => {
    if (!isOpen || step !== 'form') return;

    const animationFrameId = window.requestAnimationFrame(() => {
      filenameInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isOpen, step]);

  const handleClose = () => {
    if (busy) return;
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);
      return;
    }
    handleClose();
  };

  const handleSelect = (type: CreateResourceType) => {
    setSlideDirection('forward');
    setSelectedType(type);
    setTitle('');
    setStep('form');
  };

  const handleBack = () => {
    if (busy) return;
    setSlideDirection('back');
    setTitle('');
    setStep('select');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedType || !root || !title.trim() || busy) return;
    runCreate({
      type: selectedType,
      title: title.trim(),
      root,
    });
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('resourceCreate.title')}
      description={
        step === 'select' ? t('resourceCreate.description') : t('resourceCreate.formDescription')
      }
      size="md"
      isDismissable={!busy}
      footer={
        <div className={styles.footer}>
          <AppButton
            variant="secondary"
            isDisabled={busy}
            onPress={step === 'select' ? handleClose : handleBack}
          >
            {step === 'select' ? (
              t('actions.cancel', { ns: 'common' })
            ) : (
              <>
                <ArrowLeft size={16} aria-hidden="true" />
                {t('resourceCreate.back')}
              </>
            )}
          </AppButton>
          {step === 'form' ? (
            <AppButton
              type="submit"
              form={formId}
              variant="primary"
              isDisabled={!canSubmit}
              isPending={submitting}
            >
              {selectedType === 'note'
                ? t('resourceCreate.newNote')
                : t('actions.create', { ns: 'common' })}
            </AppButton>
          ) : null}
        </div>
      }
    >
      <HiddenFileInput
        ref={markdownFileInputRef}
        accept=".md,.markdown,text/markdown,text/x-markdown"
        onChange={handleMarkdownFileChange}
        hidden
      />
      <div
        key={step}
        className={clsx(
          styles.stage,
          slideDirection === 'forward' ? styles.stageForward : styles.stageBack
        )}
      >
        {step === 'select' ? (
          <div className={styles.options}>
            {options.map((option) => {
              const Icon = option.icon;

              return (
                <AppPressable
                  key={option.type}
                  className={styles.option}
                  onClick={() => handleSelect(option.type)}
                >
                  <span className={styles.icon}>
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <span className={styles.copy}>
                    <span className={styles.title}>{option.title}</span>
                    <span className={styles.description}>{option.description}</span>
                  </span>
                  <span className={styles.trailing} aria-hidden="true">
                    <ChevronRight size={16} />
                  </span>
                </AppPressable>
              );
            })}
          </div>
        ) : selectedOption ? (
          <form id={formId} className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formHeading}>
              <span className={styles.icon}>
                <selectedOption.icon size={18} aria-hidden="true" />
              </span>
              <span className={styles.formHeadingCopy}>
                <span className={styles.formTitle}>{selectedOption.title}</span>
                <span className={styles.formDescription}>{selectedOption.description}</span>
              </span>
            </div>
            <FormField
              aria-label={t('resourceCreate.fileName')}
              label={t('resourceCreate.fileName')}
              value={title}
              onChange={setTitle}
              isRequired
            >
              <Input ref={filenameInputRef} placeholder={t('resourceCreate.fileNamePlaceholder')} />
            </FormField>
            {selectedType === 'note' ? (
              <div className={styles.importRow}>
                <span className={styles.importCopy}>
                  <span className={styles.importTitle}>{t('resourceCreate.importNoteTitle')}</span>
                  <span className={styles.importDescription}>
                    {t('resourceCreate.importNoteDescription')}
                  </span>
                </span>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  isDisabled={!root || busy}
                  isPending={importing}
                  onPress={openMarkdownFilePicker}
                >
                  <FileInput size={16} aria-hidden="true" />
                  {t('resourceCreate.importNote')}
                </AppButton>
              </div>
            ) : null}
            {rootHasError ? (
              <div className={styles.rootError} role="alert">
                <span>{t('resourceCreate.rootUnavailable')}</span>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  isDisabled={rootLoading}
                  onPress={retryRoot}
                >
                  {t('resourceCreate.retry')}
                </AppButton>
              </div>
            ) : null}
          </form>
        ) : null}
      </div>
    </AppModal>
  );
}

export default CreateResourceModal;
