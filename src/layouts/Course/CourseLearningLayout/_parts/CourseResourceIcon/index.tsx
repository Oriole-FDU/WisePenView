import EntryIcon from '@/components/business/Icons/EntryIcon';

import type { CourseResourceIconProps } from './index.type';

function CourseResourceIcon({ node, size }: CourseResourceIconProps) {
  if (node.nodeType !== 'RESOURCE') {
    return <EntryIcon entryType="folder" size={size} />;
  }
  if (node.viewer === 'video') {
    return <EntryIcon entryType="resource" resourceIconType="video" size={size} />;
  }
  return (
    <EntryIcon
      entryType="resource"
      resourceType={node.resourceType}
      resourceIconType={node.viewer === 'pdf-preview' ? 'pdf' : undefined}
      size={size}
    />
  );
}

export default CourseResourceIcon;
