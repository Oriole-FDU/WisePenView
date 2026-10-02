import { toast } from '@heroui/react';
import { useEventListener, useLatest, useMemoizedFn } from 'ahooks';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import type { INoteService } from '@/domains/Note';
import { createClientError, FRONTEND_CLIENT_ERROR, parseErrorMessage } from '@/utils/error';

import {
  type DrawioEditorCommand,
  extractDrawioPlainText,
  readDrawioMessage,
} from '../drawioProtocol';
import { createDrawioSaveSession } from '../drawioSaveSession';

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
  const [editorReady, setEditorReady] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorError, setEditorError] = useState<unknown>();
  const postToEditor = useMemoizedFn((message: DrawioEditorCommand) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(message), drawioOrigin);
  });
  const options = useLatest({
    exportXml: () => postToEditor({ action: 'export', format: 'xml' }),
    persistXml: (xml: string, version: number) =>
      noteService.saveDrawIoSnapshot({
        resourceId,
        version,
        xml,
        plainText: extractDrawioPlainText(xml),
      }),
  });
  const createFailure = () => createClientError(FRONTEND_CLIENT_ERROR.DRAWIO_SAVE_FAILED);
  const [session] = useState(() =>
    createDrawioSaveSession({
      initialXml,
      initialVersion,
      exportXml: () => options.current.exportXml(),
      persistXml: async (xml, version) => {
        await options.current.persistXml(xml, version);
      },
      createFailure,
    })
  );
  const save = useSyncExternalStore(session.subscribe, session.getSnapshot);
  /**
   * @wisepen-manual-effect
   * 执行时机：嵌入会话挂载时接管保存任务；StrictMode 重挂时重新建立已释放的会话。
   * 不可替代原因：导出计时器和后端保存需要统一的实例生命周期。
   * cleanup：释放导出等待和订阅，迟到保存不能更新下一会话。
   */
  useEffect(() => {
    session.activate();
    return () => session.dispose();
  }, [session]);

  const notifyFailure = (error: unknown) => toast.danger(parseErrorMessage(error));
  const requestSave = () => {
    if (!canEdit || !editorLoaded) {
      const error = createFailure();
      toast.warning(t(!canEdit ? 'drawio.noEditPermission' : 'drawio.editorNotReady'));
      return Promise.reject(error);
    }
    return session.requestSave();
  };
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== drawioOrigin || event.source !== iframeRef.current?.contentWindow) return;
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
      setEditorError(undefined);
      return;
    }
    if (message.event === 'autosave' && canEdit && typeof message.xml === 'string') {
      session.observeXml(message.xml);
      return;
    }
    if (message.event === 'save' && canEdit && typeof message.xml === 'string') {
      void session.saveXml(message.xml).catch(notifyFailure);
      return;
    }
    if (message.event === 'export' && canEdit) {
      session.receiveExport(message.xml);
      return;
    }
    if (message.event === 'error') {
      const error = createClientError(FRONTEND_CLIENT_ERROR.DRAWIO_SAVE_FAILED, {
        detail: message.message,
      });
      setEditorError(error);
      session.fail(error);
      notifyFailure(error);
    }
  };
  useEventListener('message', handleMessage);
  /**
   * @wisepen-manual-effect
   * 执行时机：保存任务状态提交后通知嵌入编辑器修改标记。
   * 不可替代原因：iframe 状态必须通过协议消息同步。
   * cleanup：没有持久订阅，由会话销毁清理任务。
   */
  useEffect(() => {
    if (save.saveState === 'saved' || save.saveState === 'failed') {
      postToEditor({
        action: 'status',
        message: t(`drawio.status.${save.saveState}`),
        modified: save.saveState !== 'saved',
      });
    }
  }, [save.saveState, t, postToEditor]);
  return {
    iframeRef,
    currentVersion: save.version,
    saveState: save.saveState,
    error: editorError ?? save.error,
    editorReady,
    editorLoaded,
    requestSave,
  };
}
