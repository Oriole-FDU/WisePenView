import { Tabs as HeroTabs } from '@heroui/react';
import { clsx } from 'clsx';
import { createContext, useContext } from 'react';

import type { TabsIndicatorProps, TabsListProps, TabsProps } from './index.type';
import styles from './style.module.scss';

const TabsDefaultSurfaceContext = createContext(true);

function TabsRoot({ className, variant, ...props }: TabsProps) {
  return (
    <TabsDefaultSurfaceContext.Provider value={variant !== 'secondary'}>
      <HeroTabs className={className} variant={variant} {...props} />
    </TabsDefaultSurfaceContext.Provider>
  );
}

function TabsList({ className, ...props }: TabsListProps) {
  const hasDefaultSurface = useContext(TabsDefaultSurfaceContext);

  return <HeroTabs.List className={clsx(hasDefaultSurface && styles.list, className)} {...props} />;
}

function TabsIndicator({ className, ...props }: TabsIndicatorProps) {
  const hasDefaultSurface = useContext(TabsDefaultSurfaceContext);

  return (
    <HeroTabs.Indicator
      className={clsx(hasDefaultSurface && styles.indicator, className)}
      {...props}
    />
  );
}

export const Tabs = Object.assign(TabsRoot, {
  Indicator: TabsIndicator,
  List: TabsList,
  ListContainer: HeroTabs.ListContainer,
  Panel: HeroTabs.Panel,
  Root: TabsRoot,
  Separator: HeroTabs.Separator,
  Tab: HeroTabs.Tab,
});

export default Tabs;
