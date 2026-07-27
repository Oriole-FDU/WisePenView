import AppIconButton from '@/components/Button/AppIconButton';
import ProviderLogo from '@/components/Icons/ProviderLogo';
import { AppPopover } from '@/components/Overlay';
import type { ChatModel } from '@/domains/Chat';
import { ListBox, ListBoxItem } from '@heroui/react';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

export type ModelSelectorTriggerVariant = 'default' | 'icon';

interface ModelSelectorProps {
  models: ChatModel[];
  selectedId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (model: ChatModel) => void;
  loading?: boolean;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
  /** default：图标+名称；icon：仅图标（窄侧栏） */
  triggerVariant?: ModelSelectorTriggerVariant;
}

const renderProviderText = (model: ChatModel): string => {
  if (model.providerName && model.providerModelName) {
    return `${model.providerName} · ${model.providerModelName}`;
  }
  return model.providerModelName || model.providerName || model.provider;
};

function ModelSelector({
  models,
  selectedId,
  isOpen,
  onOpenChange,
  onChange,
  loading = false,
  disabled = false,
  placement = 'bottom',
  triggerVariant = 'default',
}: ModelSelectorProps) {
  const { t } = useTranslation('chat');
  const selected = models.find((model) => model.id === selectedId) ?? null;
  const iconOnly = triggerVariant === 'icon';
  const triggerLabel = loading
    ? t('modelSelector.loading')
    : (selected?.name ?? t('modelSelector.select'));

  return (
    <AppPopover isOpen={isOpen} onOpenChange={onOpenChange}>
      {iconOnly ? (
        <AppIconButton
          icon={
            loading ? (
              <LoaderCircle size={16} className={styles.spinIcon} aria-hidden="true" />
            ) : (
              <ProviderLogo provider={selected?.provider ?? 'openai'} size={16} />
            )
          }
          label={triggerLabel}
          isDisabled={disabled}
          overlayTrigger={<AppPopover.Trigger />}
        />
      ) : (
        <AppPopover.Trigger>
          <button
            type="button"
            className={styles.trigger}
            aria-label={triggerLabel}
            disabled={disabled}
          >
            {loading ? (
              <LoaderCircle size={16} className={styles.spinIcon} />
            ) : (
              <ProviderLogo provider={selected?.provider ?? 'openai'} size={16} />
            )}
            <span>{triggerLabel}</span>
            <ChevronDown size={16} />
          </button>
        </AppPopover.Trigger>
      )}
      <AppPopover.Content
        className={styles.popover}
        placement={placement}
        title={t('modelSelector.title')}
      >
        {models.length === 0 ? (
          <div className={styles.empty}>{t('modelSelector.empty')}</div>
        ) : (
          <ListBox
            aria-label={t('modelSelector.select')}
            selectionMode="single"
            selectedKeys={selected ? [selected.id] : []}
            className={styles.list}
          >
            {models.map((model) => (
              <ListBoxItem
                key={model.id}
                id={model.id}
                textValue={model.name}
                onPress={() => onChange(model)}
              >
                <span className={styles.item}>
                  <ProviderLogo provider={model.provider} size={18} />
                  <span className={styles.info}>
                    <span className={styles.name}>{model.name}</span>
                    <span className={styles.meta}>{renderProviderText(model)}</span>
                  </span>
                  {selected?.id === model.id ? (
                    <Check size={14} className={styles.checkIcon} />
                  ) : null}
                </span>
              </ListBoxItem>
            ))}
          </ListBox>
        )}
      </AppPopover.Content>
    </AppPopover>
  );
}

export default ModelSelector;
