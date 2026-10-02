import { type ReactNode, useEffect, useState } from 'react';

import { createEditorRuntime } from '../_runtime/editorRuntime';
import type { EditorKind, EditorSurfaceProps } from '../editor.type';
import { EditorSurfaceContext } from './EditorSurfaceContext';

export function EditorSurfaceProvider({
  kind,
  children,
  ...props
}: EditorSurfaceProps & { kind: EditorKind; children: ReactNode }) {
  const [runtime] = useState(() =>
    createEditorRuntime(props.instanceId, kind, {
      openedResource: props.target,
      loading: true,
      readOnly: true,
      hasUnsavedChanges: false,
      pendingWork: false,
      warnBeforeUnload: false,
    })
  );
  const { onRegister } = props;
  /**
   * @wisepen-manual-effect
   * 执行时机：编辑器实例提交到组件树后向宿主注册。
   * 不可替代原因：运行时身份跟随挂载生命周期，不能在 render 中修改宿主状态。
   * cleanup：仅注销当前对象，避免旧实例覆盖新实例。
   */
  useEffect(() => onRegister(runtime.editor), [onRegister, runtime]);
  return (
    <EditorSurfaceContext.Provider value={{ ...props, runtime }}>
      {children}
    </EditorSurfaceContext.Provider>
  );
}
