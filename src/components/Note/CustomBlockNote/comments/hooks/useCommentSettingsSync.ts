import { useMemoizedFn, useMount, useUnmount, useUpdateEffect } from 'ahooks';
import { useRef, useState } from 'react';
import type { Doc } from 'yjs';

import {
  getBlockNoteCommentSettingsYMap,
  getCommentSettingsFromDoc,
  setCommentSettingsOnDoc,
  type CollaboratorCommentVisibility,
  type CommentSettings,
} from '../core/commentSettings';

export function useCommentSettingsSync(doc: Doc | null | undefined) {
  const [settings, setSettings] = useState<CommentSettings>(() =>
    doc ? getCommentSettingsFromDoc(doc) : { collaboratorVisibility: 'all' }
  );
  const detachRef = useRef<(() => void) | null>(null);

  const attachDocListeners = (targetDoc: Doc) => {
    detachRef.current?.();

    const map = getBlockNoteCommentSettingsYMap(targetDoc);
    const sync = () => setSettings(getCommentSettingsFromDoc(targetDoc));

    map.observeDeep(sync);
    sync();

    detachRef.current = () => {
      map.unobserveDeep(sync);
      detachRef.current = null;
    };
  };

  useMount(() => {
    if (doc) {
      attachDocListeners(doc);
    }
  });

  useUpdateEffect(() => {
    if (!doc) {
      detachRef.current?.();
      setSettings({ collaboratorVisibility: 'all' });
      return;
    }
    attachDocListeners(doc);
  }, [doc]);

  useUnmount(() => {
    detachRef.current?.();
  });

  const setCollaboratorVisibility = useMemoizedFn(
    (collaboratorVisibility: CollaboratorCommentVisibility) => {
      if (!doc) {
        return;
      }
      const next = { collaboratorVisibility };
      setSettings(next);
      setCommentSettingsOnDoc(doc, next);
    }
  );

  return { settings, setCollaboratorVisibility };
}
