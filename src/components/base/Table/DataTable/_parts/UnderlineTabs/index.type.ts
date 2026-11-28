export interface DataTableTab<T extends string = string> {
  key: T;
  label: string;
}

export interface DataTableTabsProps<T extends string = string> {
  tabs: DataTableTab<T>[];
  activeTab: T;
  onChange: (key: T) => void;
  ariaLabel?: string;
}
