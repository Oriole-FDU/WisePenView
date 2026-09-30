import { Label, SearchField as HeroSearchField } from '@heroui/react';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import type { SearchFieldProps } from './index.type';
import styles from './style.module.less';

function SearchFieldRoot({
  className,
  label,
  labelClassName,
  variant = 'secondary',
  isRequired,
  children,
  ...props
}: SearchFieldProps) {
  return (
    <HeroSearchField
      variant={variant}
      className={clsx(styles.searchField, className)}
      isRequired={isRequired}
      {...props}
    >
      {label ? (
        <Label className={labelClassName} isRequired={isRequired}>
          {label}
        </Label>
      ) : null}
      {children as ReactNode}
    </HeroSearchField>
  );
}

const SearchField = Object.assign(SearchFieldRoot, {
  ClearButton: HeroSearchField.ClearButton,
  Group: HeroSearchField.Group,
  Input: HeroSearchField.Input,
  Root: SearchFieldRoot,
  SearchIcon: HeroSearchField.SearchIcon,
});

export type { SearchFieldProps };
export default SearchField;
