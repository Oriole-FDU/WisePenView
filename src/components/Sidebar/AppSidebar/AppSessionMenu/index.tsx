import { useChatPanelStore, useCurrentChatSessionStore } from '@/store';
import { useUpdateEffect } from 'ahooks';
import { useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { useLocation } from 'react-router-dom';
import SessionListGroup, { type SessionListGroupRef } from '../SessionListGroup';
import type { AppSessionMenuProps, AppSessionMenuRef } from './index.type';
import styles from './style.module.less';

function AppSessionMenu({
  collapsed,
  ref,
}: AppSessionMenuProps & { ref?: Ref<AppSessionMenuRef> }) {
  const location = useLocation();
  const setChatPanelCollapsed = useChatPanelStore((state) => state.setChatPanelCollapsed);
  const currentSessionId = useCurrentChatSessionStore((state) => state.currentSessionId);
  const setCurrentSession = useCurrentChatSessionStore((state) => state.setCurrentSession);
  const sessionListGroupRef = useRef<SessionListGroupRef>(null);
  const [pendingCreatedSessionId, setPendingCreatedSessionId] = useState<string>();

  const selectedKeys = useMemo(() => {
    if (currentSessionId) {
      return [`session-${currentSessionId}`];
    }
    return [location.pathname];
  }, [currentSessionId, location.pathname]);

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string, sessionTitle: string) => {
        setCurrentSession({ id: sessionId, title: sessionTitle });
        setChatPanelCollapsed(false);
        if (collapsed) {
          setPendingCreatedSessionId(sessionId);
          return;
        }
        await sessionListGroupRef.current?.refresh();
      },
    }),
    [collapsed, setChatPanelCollapsed, setCurrentSession]
  );

  useUpdateEffect(() => {
    if (collapsed || pendingCreatedSessionId == null) return;
    void sessionListGroupRef.current?.refresh();
    setPendingCreatedSessionId(undefined);
  }, [collapsed, pendingCreatedSessionId]);

  return (
    <div className={styles.menuContainer}>
      {!collapsed && <SessionListGroup ref={sessionListGroupRef} selectedKeys={selectedKeys} />}
    </div>
  );
}

AppSessionMenu.displayName = 'AppSessionMenu';

export type { AppSessionMenuRef };
export default AppSessionMenu;
