import type { ResourceTarget } from '@/domains/Resource/model/resourceTarget';

export interface ResourceTargetResolverProps {
  target: ResourceTarget;
  onTargetChange: (target: ResourceTarget) => void;
  onClose: () => void;
}

export interface UnsupportedResourceProps extends ResourceTarget {
  message?: string;
  onClose: () => void;
}
