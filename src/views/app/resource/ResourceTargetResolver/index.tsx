import { type EditorTarget, resolveEditorKind } from '@/components/editors';
import {
  isResourceViewerCompatible,
  normalizeResourceKind,
  normalizeResourceViewer,
  resolveResourceViewer,
  RESOURCE_KIND,
} from '@/domains/Resource/model/resourceTarget';

import FileViewerResolver from './_components/FileViewerResolver';
import ResourceEditorWorkspace from './_components/ResourceEditorWorkspace';
import UnsupportedResource from './_components/UnsupportedResource';
import type { ResourceTargetResolverProps } from './index.type';

function ResourceTargetResolver({ target, onTargetChange, onClose }: ResourceTargetResolverProps) {
  const { resourceId, resourceType: rawResourceType, viewer: rawViewer } = target;
  const resourceType = normalizeResourceKind(rawResourceType);
  const explicitViewer = normalizeResourceViewer(rawViewer);
  const viewer = resolveResourceViewer({ resourceType: rawResourceType, viewer: rawViewer });

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
