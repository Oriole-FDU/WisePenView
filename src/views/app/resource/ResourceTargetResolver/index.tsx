import { useEffect } from 'react';

import { type EditorTarget, resolveEditorKind } from '@/components/editors';
import {
  isResourceViewerCompatible,
  normalizeResourceKind,
  normalizeResourceViewer,
  resolveResourceViewer,
  RESOURCE_KIND,
} from '@/domains/Resource/model/resourceTarget';
import { useWorkspaceRightPanel } from '@/layouts/WorkspaceRightPanelLayout';

import FileViewerResolver from './_components/FileViewerResolver';
import ResourceEditorWorkspace from './_components/ResourceEditorWorkspace';
import UnsupportedResource from './_components/UnsupportedResource';
import type { ResourceTargetResolverProps } from './index.type';

function ResourceTargetResolver({ target, onTargetChange, onClose }: ResourceTargetResolverProps) {
  const { resourceId, resourceType: rawResourceType, viewer: rawViewer } = target;
  const resourceType = normalizeResourceKind(rawResourceType);
  const explicitViewer = normalizeResourceViewer(rawViewer);
  const viewer = resolveResourceViewer({ resourceType: rawResourceType, viewer: rawViewer });
  const { activePanelId, closePanel } = useWorkspaceRightPanel();
  const editorAvailable =
    !(rawViewer && !explicitViewer) &&
    Boolean(
      resourceType && resourceId && viewer && isResourceViewerCompatible(resourceType, viewer)
    );

  /**
   * @wisepen-manual-effect
   * 执行时机：当前资源无法挂载编辑器时。
   * 不可替代原因：不支持页和查看器选择页没有展示信息上报者，右栏无法自行判断内容已不可用。
   * cleanup：没有订阅或延迟任务，无需清理。
   */
  useEffect(() => {
    if (!editorAvailable && activePanelId && activePanelId !== 'chat') closePanel();
  }, [activePanelId, closePanel, editorAvailable]);

  if (rawViewer && !explicitViewer) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (!resourceType) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (!resourceId) {
    return <UnsupportedResource {...target} onClose={onClose} />;
  }
  if (!isResourceViewerCompatible(resourceType, viewer)) {
    return (
      <UnsupportedResource
        {...target}
        resourceType={resourceType}
        viewer={viewer}
        onClose={onClose}
      />
    );
  }
  if (resourceType === RESOURCE_KIND.FILE && !viewer) {
    return <FileViewerResolver target={target} onTargetChange={onTargetChange} onClose={onClose} />;
  }

  if (!viewer) {
    return <UnsupportedResource {...target} resourceType={resourceType} onClose={onClose} />;
  }

  const resolvedTarget: EditorTarget = {
    resourceId,
    resourceType,
    resourceName: target.resourceName,
    viewer,
  };

  return (
    <ResourceEditorWorkspace
      key={`${resourceId}:${resolveEditorKind(resolvedTarget)}`}
      target={resolvedTarget}
    />
  );
}

export default ResourceTargetResolver;
