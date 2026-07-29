import type { INoteService } from '@/domains/Note';
import { parseErrorMessage } from '@/utils/error';
import { toast } from '@heroui/react';
import { useEventListener, useUnmount } from 'ahooks';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  extractDrawioPlainText,
  readDrawioMessage,
  type DrawioEditorCommand,
  type DrawioSaveState,
} from '../drawioProtocol';

interface UseDrawioEditorSessionOptions {
  canEdit: boolean;
  drawioOrigin: string;
  initialVersion: number;
  initialXml: string;
  noteService: INoteService;
  resourceId: string;
}

export function useDrawioEditorSession({
  canEdit,
  drawioOrigin,
  initialVersion,
  initialXml,
  noteService,
  resourceId,
}: UseDrawioEditorSessionOptions) {
  const { t } = useTranslation('workspace');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const currentVersionRef = useRef(initialVersion);
  const lastSavedXmlRef = useRef(initialXml);
  const exportTimerRef = useRef<number | null>(null);
  const pendingExportForSaveRef = useRef(false);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [saveState, setSaveState] = useState<DrawioSaveState>('saved');
  const [editorReady, setEditorReady] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);

  const postToEditor = (message: DrawioEditorCommand) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), drawioOrigin);
  };

  const clearExportTimer = () => {
    if (exportTimerRef.current !== null) {
      window.clearTimeout(exportTimerRef.current);
      exportTimerRef.current = null;
    }
  };

  const persistXml = async (xml: string) => {
    if (!canEdit) {
      toast.danger(t('drawio.noEditPermission'));
      return;
    }

    const nextVersion = currentVersionRef.current + 1;
    setSaveState('saving');
    try {
      await noteService.saveDrawIoSnapshot({
        resourceId,
        version: nextVersion,
        xml,
        plainText: extractDrawioPlainText(xml),
      });
      currentVersionRef.current = nextVersion;
      lastSavedXmlRef.current = xml;
      setCurrentVersion(nextVersion);
      setSaveState('saved');
      postToEditor({ action: 'status', message: t('drawio.status.saved'), modified: false });
      toast.success(t('drawio.status.saved'));
    } catch (error) {
      setSaveState('failed');
      postToEditor({ action: 'status', message: t('drawio.status.failed'), modified: true });
      toast.danger(parseErrorMessage(error));
    }
  };

  const requestSave = () => {
    if (!canEdit) {
      toast.danger(t('drawio.noEditPermission'));
      return;
    }
    if (!editorLoaded) {
      toast.info(t('drawio.editorNotReady'));
      return;
    }
    if (saveState === 'saved') {
      toast.info(t('drawio.alreadySaved'));
      return;
    }

    pendingExportForSaveRef.current = true;
    setSaveState('saving');
    postToEditor({ action: 'export', format: 'xml' });
    clearExportTimer();
    exportTimerRef.current = window.setTimeout(() => {
      pendingExportForSaveRef.current = false;
      setSaveState('failed');
      toast.danger(t('drawio.saveRetry'));
    }, 10000);
  };

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== drawioOrigin) return;
    if (event.source !== iframeRef.current?.contentWindow) return;

    const message = readDrawioMessage(event.data);
    if (!message?.event) return;

    if (message.event === 'init') {
      setEditorReady(true);
      postToEditor({
        action: 'load',
        autosave: canEdit ? 1 : 0,
        modified: false,
        noExitBtn: 1,
        noSaveBtn: canEdit ? 0 : 1,
        saveAndExit: 0,
        xml: initialXml,
      });
      return;
    }

    if (message.event === 'load') {
      setEditorLoaded(true);
      setSaveState('saved');
      return;
    }

    if (message.event === 'autosave' && canEdit && typeof message.xml === 'string') {
      if (message.xml !== lastSavedXmlRef.current && saveState !== 'saving') {
        setSaveState('dirty');
      }
      return;
    }

    if (message.event === 'save' && typeof message.xml === 'string') {
      void persistXml(message.xml);
      return;
    }

    if (message.event === 'export' && pendingExportForSaveRef.current) {
      pendingExportForSaveRef.current = false;
      clearExportTimer();
      if (typeof message.xml === 'string') {
        void persistXml(message.xml);
      } else {
        setSaveState('failed');
        toast.danger(t('drawio.saveRetry'));
      }
      return;
    }

    if (message.event === 'error') {
      toast.danger(message.message || t('drawio.loadFailed'));
    }
  };

  useEventListener('message', handleMessage);
  useUnmount(clearExportTimer);

  return {
    iframeRef,
    currentVersion,
    saveState,
    editorReady,
    editorLoaded,
    requestSave,
  };
}
