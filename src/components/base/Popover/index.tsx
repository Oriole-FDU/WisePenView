import { Popover as HeroPopover } from '@heroui/react';
import { useState } from 'react';

import { DeferredContent, DeferredOverlayProvider } from '@/components/base/DeferredContent';

import type { PopoverRootProps } from './index.type';

const DEFAULT_POPOVER_CONTENT_DELAY = 90;

function PopoverRoot({
  children,
  contentDelay = DEFAULT_POPOVER_CONTENT_DELAY,
  deferContent = true,
  defaultOpen,
  isOpen,
  onOpenChange,
  ...props
}: PopoverRootProps) {
  const [innerOpen, setInnerOpen] = useState(Boolean(defaultOpen));
  const trackedOpen = isOpen ?? innerOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (isOpen == null) {
      setInnerOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <DeferredOverlayProvider delay={contentDelay} enabled={deferContent} isOpen={trackedOpen}>
      <HeroPopover
        {...props}
        defaultOpen={defaultOpen}
        isOpen={isOpen}
        onOpenChange={handleOpenChange}
      >
        {children}
      </HeroPopover>
    </DeferredOverlayProvider>
  );
}

export const Popover = Object.assign(PopoverRoot, {
  Arrow: HeroPopover.Arrow,
  Content: HeroPopover.Content,
  DeferredContent,
  Dialog: HeroPopover.Dialog,
  Heading: HeroPopover.Heading,
  Root: PopoverRoot,
  Trigger: HeroPopover.Trigger,
});

export type { PopoverRootProps } from './index.type';
