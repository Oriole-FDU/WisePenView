export interface AppSessionMenuProps {
  collapsed: boolean;
}

export interface AppSessionMenuRef {
  handleCreatedSession: (sessionId: string, sessionTitle: string) => Promise<void>;
}
