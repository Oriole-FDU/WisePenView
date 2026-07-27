import { FormField, Input, TextArea } from '@/components/Input';
import { Button } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import styles from '../../style.module.less';

interface SkillConfigPanelProps {
  name: string;
  description: string;
  canEdit: boolean;
  isDirty: boolean;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onReset: () => void;
  onSave: () => void;
}

function SkillConfigPanel({
  name,
  description,
  canEdit,
  isDirty,
  isLoading,
  onNameChange,
  onDescriptionChange,
  onReset,
  onSave,
}: SkillConfigPanelProps) {
  const { t } = useTranslation('skill');
  const nameMissing = name.trim().length === 0;
  const descriptionMissing = description.trim().length === 0;
  const hasMissingConfig = nameMissing || descriptionMissing;

  return (
    <>
      <header className={styles.editorHeader}>
        <span className={styles.editorFileName}>{t('config.title')}</span>
      </header>
      <div className={styles.editorBody}>
        <section className={styles.configPage} aria-label={t('config.ariaLabel')}>
          <div className={styles.configForm}>
            <div className={styles.configFormHint}>
              <strong>{t('config.introTitle')}</strong>
              <span>{t('config.intro')}</span>
            </div>
            <FormField
              aria-label={t('config.nameAriaLabel')}
              value={name}
              onChange={onNameChange}
              isDisabled={!canEdit || isLoading}
              isRequired
              label={t('config.nameLabel')}
              description={t('config.nameDescription')}
              errorMessage={nameMissing ? t('config.nameRequired') : undefined}
            >
              <Input placeholder={t('config.namePlaceholder')} />
            </FormField>

            <FormField
              aria-label={t('config.descriptionAriaLabel')}
              value={description}
              onChange={onDescriptionChange}
              isDisabled={!canEdit || isLoading}
              isRequired
              label={t('config.descriptionLabel')}
              description={t('config.descriptionHelp')}
              errorMessage={descriptionMissing ? t('config.descriptionRequired') : undefined}
            >
              <TextArea
                className={styles.configDescriptionInput}
                rows={5}
                placeholder={t('config.descriptionPlaceholder')}
              />
            </FormField>
          </div>

          <footer className={styles.configFooter}>
            <span className={styles.configFooterText}>
              {hasMissingConfig
                ? t('config.publishBlocked')
                : isDirty
                  ? t('config.dirty')
                  : t('config.saved')}
            </span>
            {canEdit ? (
              <span className={styles.configFooterActions}>
                <Button variant="secondary" isDisabled={!isDirty || isLoading} onPress={onReset}>
                  {t('config.reset')}
                </Button>
                <Button
                  variant="primary"
                  isDisabled={!isDirty || hasMissingConfig || isLoading}
                  aria-busy={isLoading || undefined}
                  onPress={onSave}
                >
                  {t('config.update')}
                </Button>
              </span>
            ) : null}
          </footer>
        </section>
      </div>
    </>
  );
}

export default SkillConfigPanel;
