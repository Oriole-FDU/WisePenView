export interface SessionListGroupProps {
  activeSessionMenuKey?: string;
  onActiveSessionMenuKeyChange?: (key: string | undefined) => void;
}

export interface SessionListGroupComponentProps extends SessionListGroupProps {
  selectedKeys: string[];
}

export interface SessionListGroupRef {
  refresh: () => Promise<void>;
}
