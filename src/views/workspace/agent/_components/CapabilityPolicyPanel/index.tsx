import AppIconButton from '@/components/Button/AppIconButton';
import AppModal from '@/components/Overlay/AppModal';
import {
  Autocomplete,
  Button,
  EmptyState,
  ListBox,
  SearchField,
  useFilter,
  type Key,
} from '@heroui/react';
import { Plus, Sparkles, Trash2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import styles from './style.module.less';

export type CapabilityPolicyKind = 'tool' | 'skill';

export interface CapabilityPolicyOption {
  id: string;
  name: string;
  internalName?: string;
  description?: string;
  disabled?: boolean;
  disabledReason?: string;
}

interface Props {
  kind: CapabilityPolicyKind;
  title: string;
  description: string;
  addLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  selectedEmptyText: string;
  options: CapabilityPolicyOption[];
  selectedIds: string[];
  disabled?: boolean;
  onChange: (ids: string[]) => void;
}

export default function CapabilityPolicyPanel({
  kind,
  title,
  description,
  addLabel,
  searchPlaceholder,
  emptyText,
  selectedEmptyText,
  options,
  selectedIds,
  disabled,
  onChange,
}: Props) {
  const { contains } = useFilter({ sensitivity: 'base' });
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const optionMap = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const disabledIds = useMemo(
    () => new Set(options.filter((option) => option.disabled).map((option) => option.id)),
    [options]
  );
  const selectedOptions = selectedIds.map(
    (id) =>
      optionMap.get(id) ?? {
        id,
        name: id,
        internalName: id,
        description: '该项目暂未在可选列表中返回。',
      }
  );
  const Icon = kind === 'skill' ? Sparkles : Wrench;

  const commitSelection = (keys: Key[] | Key | Set<Key> | 'all' | null) => {
    const nextKeys =
      keys === 'all'
        ? options.filter((option) => !option.disabled).map((option) => option.id)
        : Array.isArray(keys)
          ? keys
          : keys instanceof Set
            ? [...keys]
            : keys == null
              ? []
              : [keys];
    onChange(nextKeys.map(String).filter((id) => !disabledIds.has(id)));
  };

  const remove = (id: string) => onChange(selectedIds.filter((item) => item !== id));

  return (
    <div className={styles.block}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.heading}>
            <strong>{title}</strong>
            <span>{description}</span>
          </div>
          <AppIconButton
            icon={<Plus size={15} aria-hidden="true" />}
            label={addLabel}
            size="sm"
            isDisabled={disabled}
            onPress={() => setIsPickerOpen(true)}
          />
        </header>

        <div className={styles.selectedList}>
          {selectedOptions.length === 0 ? (
            <div className={styles.selectedEmpty}>{selectedEmptyText}</div>
          ) : (
            selectedOptions.map((option) => (
              <div key={option.id} className={styles.selectedRow}>
                <span className={styles.selectedIcon}>
                  <Icon size={14} />
                </span>
                <span className={styles.selectedCopy}>
                  <span className={styles.selectedTitle}>
                    <strong>{option.name}</strong>
                    {option.internalName ? <small>{option.internalName}</small> : null}
                  </span>
                  <span className={styles.selectedDescription} title={option.description}>
                    {option.description || '暂无描述'}
                  </span>
                </span>
                <AppIconButton
                  icon={<Trash2 size={14} aria-hidden="true" />}
                  label={`移除 ${option.name}`}
                  size="sm"
                  isDisabled={disabled}
                  onPress={() => remove(option.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
      <AppModal
        isOpen={isPickerOpen}
        onOpenChange={setIsPickerOpen}
        title={addLabel}
        description={description}
        size="lg"
        actions={
          <Button variant="primary" onPress={() => setIsPickerOpen(false)}>
            完成
          </Button>
        }
      >
        <div className={styles.modalPicker}>
          <Autocomplete.Filter filter={contains}>
            <SearchField autoFocus variant="secondary">
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input placeholder={searchPlaceholder} />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <ListBox
              className={styles.options}
              aria-label={addLabel}
              selectionMode="multiple"
              selectedKeys={selectedIds}
              onSelectionChange={commitSelection}
              renderEmptyState={() => <EmptyState>{emptyText}</EmptyState>}
            >
              {options.map((option) => {
                const helper = option.disabledReason || option.description || '暂无描述';
                return (
                  <ListBox.Item
                    key={option.id}
                    id={option.id}
                    textValue={`${option.name} ${option.internalName ?? ''} ${helper}`}
                    isDisabled={option.disabled}
                  >
                    <span className={styles.option}>
                      <span className={styles.optionIcon}>
                        <Icon size={14} />
                      </span>
                      <span className={styles.optionCopy}>
                        <strong>{option.name}</strong>
                        <small title={helper}>{helper}</small>
                      </span>
                      {option.disabled ? <em>不可用</em> : null}
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                );
              })}
            </ListBox>
          </Autocomplete.Filter>
        </div>
      </AppModal>
    </div>
  );
}
