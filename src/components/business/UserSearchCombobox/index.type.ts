import type { ReactNode } from 'react';

import type { UserSearchUser } from '@/domains/User';

export interface UserSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (user: UserSearchUser) => void;
  queryUsers: (keyword: string) => Promise<UserSearchUser[]>;
  onEmptySubmit?: () => void;
  onError?: (err: unknown) => void;
  excludedUserIds?: Set<string>;
  placeholder?: string;
  ariaLabel?: string;
  submitLabel?: string;
  submitIcon?: ReactNode;
  minKeywordLength?: number;
  disabled?: boolean;
}
