import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Divider, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { RiArrowLeftLine } from 'react-icons/ri';
import clsx from 'clsx';
import * as Y from 'yjs';

import CustomBlockNote from '@/components/Note/CustomBlockNote';
import { WisepenProvider } from '@/services/Note/yjs';
import noteStyles from '../style.module.less';
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
    <div className={noteStyles.pageWrap}>
      <div className={clsx(noteStyles.noteContent, noteStyles.noteContentVisible)}>
        <div className={noteStyles.root}>
          <header className={noteStyles.pageHeader}>
            <Link to="/app/drive" className={noteStyles.backLink}>
              <RiArrowLeftLine size={18} aria-hidden />
              <span>返回云盘</span>
            </Link>
          </header>
          <Typography.Title level={1} className={noteStyles.pageHeading}>
            BlockNote 演示
          </Typography.Title>
          <Divider className={noteStyles.titleDivider} />
          <div className={noteStyles.body}>
            <div className={styles.editorRoot}>
              <CustomBlockNote
                resourceId={DEMO_RESOURCE_ID}
                doc={doc}
                provider={provider}
                userId={userId}
                cursorColor={DEMO_CURSOR_COLOR}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteBlockNoteDemo;
