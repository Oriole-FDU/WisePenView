import React, { useEffect, useMemo, useState } from 'react';
import { Alert } from 'antd';
import * as Y from 'yjs';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import { WisepenProvider } from '@/services/Note/yjs';
import styles from './style.module.less';

const DEMO_RESOURCE_ID = 'demo-note';
const DEMO_CURSOR_COLOR = '#1677ff';

const NoteBlockNoteDemo: React.FC = () => {
  const demoUserId =
    import.meta.env.DEV && (import.meta.env.VITE_NOTE_LOCAL_USER_ID?.trim() || 'local-dev-user');
  const userId = demoUserId || 'local-dev-user';

  const [isConnected, setIsConnected] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const { doc, provider } = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const collabOrigin =
      import.meta.env.VITE_NOTE_COLLAB_ORIGIN?.trim() ||
      `${protocol}//${window.location.host}/note-collab`;
    const yDoc = new Y.Doc();
    const wsProvider = new WisepenProvider(collabOrigin, DEMO_RESOURCE_ID, yDoc, userId, {
      connect: false,
    });
    return { doc: yDoc, provider: wsProvider };
  }, [userId]);

  useEffect(() => {
    const subscription = provider.watchSessionConnection({
      onSessionReady: () => setSessionReady(true),
      onConnectionEstablished: () => setIsConnected(true),
      onDisconnected: () => setIsConnected(false),
    });

    provider.connect();

    return () => {
      subscription.unsubscribe();
      provider.destroy();
      doc.destroy();
    };
  }, [doc, provider]);

  return (
    <div className={styles.page}>
      {sessionReady ? null : (
        <Alert
          type="info"
          showIcon
          className={styles.alert}
          message="正在连接协同服务..."
          description="可通过 VITE_NOTE_COLLAB_ORIGIN 配置调试地址（例如 ws://localhost:9700/note-collab）。"
        />
      )}
      {isConnected ? null : (
        <Alert
          type="warning"
          showIcon
          className={styles.alert}
          message="协同连接未建立"
          description="请检查本地协同服务是否运行。"
        />
      )}
      <div className={styles.editorWrap}>
        <CustomBlockNote
          resourceId={DEMO_RESOURCE_ID}
          doc={doc}
          provider={provider}
          userId={userId}
          cursorColor={DEMO_CURSOR_COLOR}
        />
      </div>
    </div>
  );
};

export default NoteBlockNoteDemo;
