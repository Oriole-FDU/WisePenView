import type { DependencyList, ReactNode } from 'react';

import {
  type ResourceHostLayoutConfig,
  useResourceHostLayoutConfig,
} from '@/views/resource/ResourceHostContext';

interface ResourceLayoutConfigProps {
  children: ReactNode;
  className: string;
  config?: ResourceHostLayoutConfig;
  deps: DependencyList;
}

export default function ResourceLayoutConfig({
  children,
  className,
  config,
  deps,
}: ResourceLayoutConfigProps) {
  const frameConfig = {
    className,
    ...(config ?? {}),
  } satisfies ResourceHostLayoutConfig;
  useResourceHostLayoutConfig(() => frameConfig, deps);

  return <>{children}</>;
}
