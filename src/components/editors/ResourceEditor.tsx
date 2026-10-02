import { useState } from 'react';

import { createUuid } from '@/utils/random/createUuid';

import type { EditorHostCapabilities, EditorSurfaceProps, EditorTarget } from './editor.type';
import { editorRegistry, resolveEditorKind } from './editorRegistry';

export interface ResourceEditorProps {
  target: EditorTarget;
  host: EditorHostCapabilities;
  onRegister: EditorSurfaceProps['onRegister'];
  onPresentationChange: EditorSurfaceProps['onPresentationChange'];
}

function MountedEditor({ target, host, onRegister, onPresentationChange }: ResourceEditorProps) {
  const [instanceId] = useState(() => `${host.hostId}:${createUuid()}`);
  const kind = resolveEditorKind(target);
  if (!kind) return null;
  const Surface = editorRegistry[kind];
  return (
    <Surface
      target={target}
      instanceId={instanceId}
      host={host}
      onRegister={onRegister}
      onPresentationChange={onPresentationChange}
    />
  );
}

/**
 * 解析资源目标对应的编辑器并挂载。
 * 编辑器上报展示信息并接收宿主能力，工作区外壳由调用方在外层装配；
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
