import { Bot, ChevronRight, PenLine, Workflow, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppPressable } from '@/components/base/Button';
import { Spin } from '@/components/base/Feedback';

import type { CreateResourceModalProps, CreateResourceType } from './index.type';
import styles from './style.module.scss';

interface ResourceOption {
  type: CreateResourceType;
  title: string;
  description: string;
  icon: typeof PenLine;
}

function CreateResourceModal({
  isOpen,
  loadingType,
  onOpenChange,
  onSelect,
}: CreateResourceModalProps) {
  const { t } = useTranslation(['shell', 'drive']);
  const loading = Boolean(loadingType);
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

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={t('resourceCreate.title')}
      description={t('resourceCreate.description')}
      size="md"
      isDismissable={!loading}
    >
      <div className={styles.options}>
        {options.map((option) => {
          const Icon = option.icon;
          const isPreparing = loadingType === option.type;

          return (
            <AppPressable
              key={option.type}
              className={styles.option}
              disabled={loading}
              aria-busy={isPreparing || undefined}
              onClick={() => onSelect(option.type)}
            >
              <span className={styles.icon}>
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className={styles.copy}>
                <span className={styles.title}>{option.title}</span>
                <span className={styles.description}>{option.description}</span>
              </span>
              <span className={styles.trailing} aria-hidden="true">
                {isPreparing ? <Spin size="small" /> : <ChevronRight size={16} />}
              </span>
            </AppPressable>
          );
        })}
      </div>
    </AppModal>
  );
}

export default CreateResourceModal;
