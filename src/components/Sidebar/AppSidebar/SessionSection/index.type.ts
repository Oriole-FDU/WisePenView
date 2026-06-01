export interface SessionSectionProps {
  activeSessionMenuKey?: string;
  onActiveSessionMenuKeyChange: (key: string | undefined) => void;
}

export interface SessionSectionRef {
  handleCreatedSession: (sessionId: string) => Promise<void>;
}
