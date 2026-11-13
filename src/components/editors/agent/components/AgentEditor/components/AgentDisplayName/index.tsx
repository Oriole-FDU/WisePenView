import { Bot, Pencil } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppIconButton from '@/components/base/Button/AppIconButton';
import { Input } from '@/components/base/Input';

import styles from './style.module.scss';

interface Props {
  disabled: boolean;
  displayName: string;
  onRename: (name: string) => Promise<void>;
}

export default function AgentDisplayName({ disabled, displayName, onRename }: Props) {
  const { t } = useTranslation('agent');
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const cancelingRef = useRef(false);

  const cancel = () => {
    cancelingRef.current = true;
    setValue(displayName);
    setEditing(false);
  };

  const submit = async () => {
    if (submittingRef.current) return;
    const nextName = value.trim();
    if (!nextName) {
      cancel();
      return;
    }
    if (nextName === displayName) {
      setEditing(false);
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    try {
      await onRename(nextName);
      setValue(nextName);
      setEditing(false);
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  };

  return (
    <header className={styles.root}>
      <div className={styles.inner}>
        <span className={styles.icon} aria-hidden="true">
          <Bot size={19} />
        </span>
        <div className={styles.copy}>
          {editing ? (
            <Input
              aria-label={t('page.displayNameLabel')}
              className={styles.input}
              value={value}
              autoFocus
              disabled={saving}
              onChange={(event) => setValue(event.target.value)}
              onBlur={() => {
                if (cancelingRef.current) {
                  cancelingRef.current = false;
                  return;
                }
                void submit();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void submit();
                }
                if (event.key === 'Escape') {
                  event.preventDefault();
                  cancel();
                }
              }}
            />
          ) : (
            <div className={styles.titleRow}>
              <h1 className={styles.title}>{value}</h1>
              <AppIconButton
                icon={<Pencil size={14} aria-hidden="true" />}
                label={t('page.displayNameEdit')}
                size="sm"
                isDisabled={disabled}
                onPress={() => {
                  cancelingRef.current = false;
                  setEditing(true);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
