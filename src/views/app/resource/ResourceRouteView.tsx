import type { ResourceTarget } from '@/domains/Resource/model/resourceTarget';

import ResourceTargetResolver from './ResourceTargetResolver';

interface ResourceRouteViewProps {
  target: ResourceTarget;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}

function ResourceRouteView({ target, onTargetChange, onClose }: ResourceRouteViewProps) {
  return (
    <ResourceTargetResolver target={target} onTargetChange={onTargetChange} onClose={onClose} />
  );
}

export default ResourceRouteView;
