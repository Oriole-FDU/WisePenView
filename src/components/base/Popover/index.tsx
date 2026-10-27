import { Popover as HeroPopover } from '@heroui/react';
import { clsx } from 'clsx';
import { type ComponentProps, useState } from 'react';

import { DeferredContent, DeferredOverlayProvider } from '@/components/base/DeferredContent';

import type { PopoverRootProps } from './index.type';
import overlayStyles from './shared/styles.module.scss';

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

function PopoverContent({ className, ...props }: ComponentProps<typeof HeroPopover.Content>) {
  return <HeroPopover.Content className={clsx(overlayStyles.surface, className)} {...props} />;
}

function PopoverDialog({ className, ...props }: ComponentProps<typeof HeroPopover.Dialog>) {
  return <HeroPopover.Dialog className={clsx(overlayStyles.dialog, className)} {...props} />;
}

export const Popover = Object.assign(PopoverRoot, {
  Arrow: HeroPopover.Arrow,
  Content: PopoverContent,
  DeferredContent,
  Dialog: PopoverDialog,
  Heading: HeroPopover.Heading,
  Root: PopoverRoot,
  Trigger: HeroPopover.Trigger,
});

export type { PopoverRootProps } from './index.type';
