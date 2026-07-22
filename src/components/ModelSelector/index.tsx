import ProviderLogo from '@/components/Icons/ProviderLogo';
import { Popover } from '@/components/Overlay';
import type { ChatModel } from '@/domains/Chat';
import { ListBox, ListBoxItem } from '@heroui/react';
import clsx from 'clsx';
import { Check, ChevronDown, LoaderCircle } from 'lucide-react';
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
  const selected = models.find((model) => model.id === selectedId) ?? null;
  const iconOnly = triggerVariant === 'icon';
  const triggerLabel = loading ? '模型加载中' : (selected?.name ?? '选择模型');

  return (
    <Popover isOpen={isOpen} onOpenChange={onOpenChange}>
      <Popover.Trigger>
        <button
          type="button"
          className={clsx(styles.trigger, iconOnly && styles.triggerIconOnly)}
          aria-label={triggerLabel}
          title={triggerLabel}
          disabled={disabled}
        >
          {loading ? (
            <LoaderCircle size={16} className={styles.spinIcon} />
          ) : (
            <ProviderLogo provider={selected?.provider ?? 'openai'} size={16} />
          )}
          {!iconOnly ? <span>{triggerLabel}</span> : null}
          {!iconOnly ? <ChevronDown size={16} /> : null}
        </button>
      </Popover.Trigger>
      <Popover.Content className={styles.popover} placement={placement}>
        <Popover.Dialog>
          <div className={styles.menu}>
            <div className={styles.title}>模型</div>
            {models.length === 0 ? (
              <div className={styles.empty}>暂无可用模型</div>
            ) : (
              <ListBox
                aria-label="选择模型"
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
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export default ModelSelector;
