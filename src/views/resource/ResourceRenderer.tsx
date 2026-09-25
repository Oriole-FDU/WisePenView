import { lazy } from 'react';

import {
  RESOURCE_KIND,
  RESOURCE_VIEWER,
  type ResourceKind,
  type ResourceViewer,
} from '@/domains/Resource/model/resourceTarget';

const AgentView = lazy(() => import('./agent'));
const DrawioView = lazy(() => import('./drawio'));
const NoteView = lazy(() => import('./note'));
const OfficeView = lazy(() => import('./office'));
const PdfView = lazy(() => import('./pdf'));
const SkillView = lazy(() => import('./skill'));

export interface ResolvedResourceTarget {
  resourceId: string;
  resourceType: ResourceKind;
  resourceName?: string;
  viewer: ResourceViewer;
}

interface ResourceRendererProps {
  target: ResolvedResourceTarget;
}

function renderResource(resourceType: ResourceKind, viewer: ResourceViewer, resourceId: string) {
  if (resourceType === RESOURCE_KIND.NOTE) {
    return <NoteView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.DRAWIO) {
    return <DrawioView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.SKILL) {
    return <SkillView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.AGENT) {
    return <AgentView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.FILE && viewer === RESOURCE_VIEWER.PDF_PREVIEW) {
    return <PdfView resourceId={resourceId} />;
  }
  if (resourceType === RESOURCE_KIND.FILE && viewer === RESOURCE_VIEWER.OFFICE) {
    return <OfficeView resourceId={resourceId} />;
  }
  return null;
}

function ResourceRenderer({ target }: ResourceRendererProps) {
  return renderResource(target.resourceType, target.viewer, target.resourceId);
}

export default ResourceRenderer;
