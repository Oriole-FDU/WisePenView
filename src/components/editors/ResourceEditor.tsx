import { useState } from 'react';

import type { EditorHostCapabilities, EditorSurfaceProps, EditorTarget } from './editor.type';
import { editorRegistry, resolveEditorKind } from './editorRegistry';

export interface ResourceEditorProps {
  target: EditorTarget;
  host: EditorHostCapabilities;
  onRegister: EditorSurfaceProps['onRegister'];
  renderWorkspace: EditorSurfaceProps['renderWorkspace'];
}

function MountedEditor({ target, host, onRegister, renderWorkspace }: ResourceEditorProps) {
  const [instanceId] = useState(() => `${host.hostId}:${crypto.randomUUID()}`);
  const kind = resolveEditorKind(target);
  if (!kind) return null;
  const Surface = editorRegistry[kind];
  return (
    <Surface
      target={target}
      instanceId={instanceId}
      host={host}
      onRegister={onRegister}
      renderWorkspace={renderWorkspace}
    />
  );
}

/**
 * 解析资源目标对应的编辑器并挂载。
 * 工作区外壳（顶栏、侧栏、聊天绑定）与宿主能力由调用方注入，编辑器层不感知宿主布局；
 * 按资源与编辑器类型重建实例，保证运行态身份跟随挂载生命周期。
 */
export default function ResourceEditor(props: ResourceEditorProps) {
  return (
    <MountedEditor
      key={`${props.target.resourceId}:${resolveEditorKind(props.target)}`}
      {...props}
    />
  );
}
