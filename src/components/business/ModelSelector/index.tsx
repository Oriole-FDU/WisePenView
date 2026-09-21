import { Chip, Description, Dropdown, Header, Label } from '@heroui/react';
import { ChevronDown, LoaderCircle } from 'lucide-react';
import type { Key } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import ProviderLogo from '@/components/base/Icons/ProviderLogo';
import type { ChatModel } from '@/domains/Chat';

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

const isFreeModel = (model: ChatModel): boolean => model.isFree;

const prioritizeFreeModels = (models: ChatModel[]): ChatModel[] =>
  models
    .map((model, index) => ({ model, index }))
    .sort((left, right) => {
      const freePriority = Number(isFreeModel(right.model)) - Number(isFreeModel(left.model));
      return freePriority || left.index - right.index;
    })
    .map(({ model }) => model);

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
  const orderedModels = prioritizeFreeModels(models);
  const iconOnly = triggerVariant === 'icon';
  const triggerLabel = loading
    ? t('modelSelector.loading')
    : (selected?.name ?? t('modelSelector.select'));
  const handleAction = (key: Key) => {
    const model = models.find((item) => item.id === key);
    if (model) {
      onChange(model);
    }
  };

  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
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
          overlayTrigger={<Dropdown.Trigger />}
        />
      ) : (
        <Dropdown.Trigger>
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
        </Dropdown.Trigger>
      )}
      <Dropdown.Popover className={styles.popover} placement={placement}>
        {models.length === 0 ? (
          <div className={styles.empty}>{t('modelSelector.empty')}</div>
        ) : (
          <Dropdown.Menu
            aria-label={t('modelSelector.select')}
            selectionMode="single"
            selectedKeys={selected ? [selected.id] : []}
            className={styles.list}
            onAction={handleAction}
          >
            <Dropdown.Section>
              <Header>{t('modelSelector.title')}</Header>
              {orderedModels.map((model) => (
                <Dropdown.Item key={model.id} id={model.id} textValue={model.name}>
                  <ProviderLogo provider={model.provider} size={18} />
                  <span className={styles.info}>
                    <span className={styles.nameRow}>
                      <Label>{model.name}</Label>
                      {isFreeModel(model) ? (
                        <Chip size="sm" variant="soft" color="success" className={styles.freeChip}>
                          <Chip.Label>{t('modelSelector.free')}</Chip.Label>
                        </Chip>
                      ) : null}
                    </span>
                    <Description>{renderProviderText(model)}</Description>
                  </span>
                  <Dropdown.ItemIndicator />
                </Dropdown.Item>
              ))}
            </Dropdown.Section>
          </Dropdown.Menu>
        )}
      </Dropdown.Popover>
    </Dropdown>
  );
}

export default ModelSelector;
