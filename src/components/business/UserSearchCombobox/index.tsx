import { TextField } from '@heroui/react';
import { useDebounceFn, useUnmount } from 'ahooks';
import type { KeyboardEvent } from 'react';
import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppAvatar from '@/components/base/Avatar';
import { AppButton } from '@/components/base/Button';
import { Input } from '@/components/base/Input';
import type { UserSearchUser } from '@/domains/User';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/utils/cn';

import type { UserSearchComboboxProps } from './index.type';
import styles from './style.module.less';

const DEFAULT_MIN_KEYWORD_LENGTH = 2;

const getDisplayInitial = (name: string): string => name.trim().charAt(0).toUpperCase() || '?';

const getUserDisplayName = (user: UserSearchUser, fallbackName: string): string =>
  user.realName?.trim() || user.nickname?.trim() || user.username.trim() || fallbackName;

const getUserDescription = (user: UserSearchUser): string =>
  user.username ? `@${user.username}` : user.userId;

interface ActiveOptionState {
  keyword: string;
  index: number;
}

function UserSearchCombobox({
  value,
  onValueChange,
  onSelect,
  queryUsers,
  onEmptySubmit,
  onError,
  excludedUserIds,
  placeholder,
  ariaLabel,
  submitLabel,
  submitIcon,
  minKeywordLength = DEFAULT_MIN_KEYWORD_LENGTH,
  disabled = false,
}: UserSearchComboboxProps) {
  const { t } = useTranslation('common');
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const keyword = value.trim();
  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword);
  const [isFocused, setIsFocused] = useState(false);
  const [activeOption, setActiveOption] = useState<ActiveOptionState>({ keyword: '', index: 0 });
  const blurTimerRef = useRef<number | null>(null);
  const {
    data: queryResult,
    loading,
    runAsync,
  } = useApi(
    async (nextKeyword: string = debouncedKeyword) => {
      const queryKeyword = nextKeyword.trim();
      const users = await queryUsers(queryKeyword);
      return { keyword: queryKeyword, users };
    },
    {
      ready: debouncedKeyword.length >= minKeywordLength && !disabled,
      refreshDeps: [debouncedKeyword, queryUsers, minKeywordLength, disabled],
    }
  );
  const { run: updateDebouncedKeyword, cancel: cancelDebouncedKeyword } = useDebounceFn(
    (nextKeyword: string) => setDebouncedKeyword(nextKeyword.trim()),
    { wait: 250 }
  );

  const isFreshResult = queryResult?.keyword === keyword;
  const users =
    keyword.length >= minKeywordLength && isFreshResult
      ? queryResult.users.filter((user) => !excludedUserIds?.has(user.userId))
      : [];
  const shouldShowList = isFocused && keyword.length >= minKeywordLength;
  const shouldShowLoading = loading || (shouldShowList && !isFreshResult);
  const activeIndex =
    activeOption.keyword === keyword
      ? Math.min(activeOption.index, Math.max(0, users.length - 1))
      : 0;
  const activeUser = users[activeIndex];
  const activeOptionId = activeUser ? `${listboxId}-option-${activeUser.userId}` : undefined;

  useUnmount(() => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
    }
    cancelDebouncedKeyword();
  });

  const selectUser = (user: UserSearchUser) => {
    onSelect(user);
    setActiveOption({ keyword: '', index: 0 });
    setIsFocused(false);
  };

  const selectFirstAvailableUser = async () => {
    if (!keyword || keyword.length < minKeywordLength) {
      onEmptySubmit?.();
      return false;
    }
    const nextUsers = isFreshResult
      ? users
      : ((await runAsync(keyword))?.users ?? []).filter(
          (user) => !excludedUserIds?.has(user.userId)
        );
    const nextUser = nextUsers[activeIndex] ?? nextUsers[0];
    if (nextUser) {
      selectUser(nextUser);
      return true;
    }
    onEmptySubmit?.();
    return false;
  };

  const handleSubmit = () => {
    void selectFirstAvailableUser().catch((err) => {
      onError?.(err);
    });
  };

  const handleValueChange = (nextValue: string) => {
    onValueChange(nextValue);
    updateDebouncedKeyword(nextValue);
    if (!disabled && nextValue.trim().length >= minKeywordLength) {
      setIsFocused(true);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsFocused(true);
      if (users.length === 0) return;
      setActiveOption({ keyword, index: (activeIndex + 1) % users.length });
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsFocused(true);
      if (users.length === 0) return;
      setActiveOption({ keyword, index: (activeIndex - 1 + users.length) % users.length });
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsFocused(false);
    }
  };

  const handleBlur = () => {
    // 延迟关闭，给鼠标点击候选项留出触发 onClick 的时间。
    blurTimerRef.current = window.setTimeout(() => {
      setIsFocused(false);
    }, 120);
  };

  const handleFocus = () => {
    if (blurTimerRef.current) {
      window.clearTimeout(blurTimerRef.current);
      blurTimerRef.current = null;
    }
    setIsFocused(true);
  };

  const renderUser = (user: UserSearchUser, index: number) => {
    const displayName = getUserDisplayName(user, t('userSearch.fallbackName', { id: user.userId }));
    const selected = index === activeIndex;
    return (
      <button
        key={user.userId}
        ref={(node) => {
          if (selected) {
            node?.scrollIntoView({ block: 'nearest' });
          }
        }}
        id={`${listboxId}-option-${user.userId}`}
        type="button"
        role="option"
        aria-selected={selected}
        className={cn(styles.option, selected && styles.optionActive)}
        onMouseEnter={() => setActiveOption({ keyword, index })}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => selectUser(user)}
      >
        <AppAvatar aria-label={displayName} className={styles.avatar}>
          {user.avatar ? <AppAvatar.Image alt={displayName} src={user.avatar} /> : null}
          <AppAvatar.Fallback>{getDisplayInitial(displayName)}</AppAvatar.Fallback>
        </AppAvatar>
        <span className={styles.optionMeta}>
          <span className={styles.optionName}>{displayName}</span>
          <span className={styles.optionDescription}>{getUserDescription(user)}</span>
        </span>
      </button>
    );
  };

  return (
    <div className={styles.root} onFocusCapture={handleFocus} onBlurCapture={handleBlur}>
      <div className={styles.controlRow}>
        <TextField
          aria-label={ariaLabel ?? t('userSearch.aria')}
          value={value}
          onChange={handleValueChange}
        >
          <Input
            placeholder={placeholder ?? t('userSearch.placeholder')}
            disabled={disabled}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={shouldShowList}
            aria-controls={shouldShowList ? listboxId : undefined}
            aria-activedescendant={shouldShowList ? activeOptionId : undefined}
            onKeyDown={handleKeyDown}
          />
        </TextField>
        {submitLabel ? (
          <AppButton
            variant="secondary"
            className={styles.submitButton}
            isDisabled={disabled || loading}
            onPress={handleSubmit}
          >
            {submitIcon}
            {submitLabel}
          </AppButton>
        ) : null}
      </div>
      {shouldShowList ? (
        <div
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          aria-label={t('userSearch.suggestionsAria')}
        >
          {shouldShowLoading ? (
            <div className={styles.state}>{t('userSearch.searching')}</div>
          ) : users.length > 0 ? (
            users.map(renderUser)
          ) : (
            <div className={styles.state}>{t('userSearch.noMatch')}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default UserSearchCombobox;
