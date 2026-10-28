import { Tabs as HeroTabs } from '@heroui/react';
import { clsx } from 'clsx';
import { type ComponentProps, createContext, useContext } from 'react';

import styles from './style.module.scss';

const TabsDefaultSurfaceContext = createContext(true);

function TabsRoot({ className, variant, ...props }: ComponentProps<typeof HeroTabs>) {
  return (
    <TabsDefaultSurfaceContext.Provider value={variant !== 'secondary'}>
      <HeroTabs className={className} variant={variant} {...props} />
    </TabsDefaultSurfaceContext.Provider>
  );
}

function TabsList({ className, ...props }: ComponentProps<typeof HeroTabs.List>) {
  const hasDefaultSurface = useContext(TabsDefaultSurfaceContext);

  return <HeroTabs.List className={clsx(hasDefaultSurface && styles.list, className)} {...props} />;
}

function TabsIndicator({ className, ...props }: ComponentProps<typeof HeroTabs.Indicator>) {
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
