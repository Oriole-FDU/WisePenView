import { useImperativeHandle, useRef, type Ref } from 'react';
import SessionListGroup, { type SessionListGroupRef } from '../SessionListGroup';
import type { SessionSectionProps, SessionSectionRef } from './index.type';

function SessionSection({
  activeSessionMenuKey,
  onActiveSessionMenuKeyChange,
  ref,
}: SessionSectionProps & { ref?: Ref<SessionSectionRef> }) {
  const sessionListGroupRef = useRef<SessionListGroupRef>(null);

  useImperativeHandle(
    ref,
    () => ({
      handleCreatedSession: async (sessionId: string) => {
        onActiveSessionMenuKeyChange(`session-${sessionId}`);
        await sessionListGroupRef.current?.refresh();
      },
    }),
    [onActiveSessionMenuKeyChange]
  );

  return (
    <SessionListGroup
      ref={sessionListGroupRef}
      activeSessionMenuKey={activeSessionMenuKey}
      onActiveSessionMenuKeyChange={onActiveSessionMenuKeyChange}
      selectedKeys={activeSessionMenuKey ? [activeSessionMenuKey] : []}
    />
  );
}

SessionSection.displayName = 'SessionSection';

export default SessionSection;
