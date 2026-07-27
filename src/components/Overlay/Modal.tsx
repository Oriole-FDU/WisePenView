import { Modal as HeroModal } from '@heroui/react';
import type { ComponentProps } from 'react';
import { createContext, useContext, useState } from 'react';

import { DeferredContent, DeferredOverlayProvider } from './DeferredContent';

const DEFAULT_MODAL_CONTENT_DELAY = 120;

type HeroModalProps = ComponentProps<typeof HeroModal>;

type ModalRootProps = HeroModalProps & {
  contentDelay?: number;
  deferContent?: boolean;
};

type HeroModalBackdropProps = ComponentProps<typeof HeroModal.Backdrop>;

type ModalBackdropProps = HeroModalBackdropProps & {
  contentDelay?: number;
  deferContent?: boolean;
};

type ModalRootControlContextValue = {
  contentDelay: number;
  defaultOpen?: boolean;
  deferContent: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
};

const ModalRootControlContext = createContext<ModalRootControlContextValue | null>(null);

function hasRootOverlayControl({
  defaultOpen,
  isOpen,
  onOpenChange,
  state,
}: Pick<ModalRootProps, 'defaultOpen' | 'isOpen' | 'onOpenChange' | 'state'>): boolean {
  return defaultOpen !== undefined || isOpen !== undefined || onOpenChange != null || state != null;
}

function ModalRoot({
  children,
  contentDelay = DEFAULT_MODAL_CONTENT_DELAY,
  deferContent = true,
  defaultOpen,
  isOpen,
  onOpenChange,
  state,
  ...props
}: ModalRootProps) {
  const controlledOpen = state?.isOpen ?? isOpen;
  const shouldUseBackdropControl = hasRootOverlayControl({
    defaultOpen,
    isOpen,
    onOpenChange,
    state,
  });
  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen);
  };
  const rootControl = {
    contentDelay,
    defaultOpen,
    deferContent,
    isOpen: controlledOpen,
    onOpenChange: state?.setOpen ?? handleOpenChange,
  } satisfies ModalRootControlContextValue;

  if (shouldUseBackdropControl) {
    return (
      <ModalRootControlContext.Provider value={rootControl}>
        {children}
      </ModalRootControlContext.Provider>
    );
  }

  return (
    <ModalRootControlContext.Provider value={null}>
      <HeroModal {...props}>{children}</HeroModal>
    </ModalRootControlContext.Provider>
  );
}

function ModalBackdrop({
  children,
  contentDelay,
  defaultOpen,
  deferContent,
  isOpen,
  onOpenChange,
  ...props
}: ModalBackdropProps) {
  const rootControl = useContext(ModalRootControlContext);
  const resolvedDefaultOpen = defaultOpen ?? rootControl?.defaultOpen;
  const resolvedIsOpen = isOpen ?? rootControl?.isOpen;
  const resolvedOnOpenChange = onOpenChange ?? rootControl?.onOpenChange;
  const resolvedContentDelay =
    contentDelay ?? rootControl?.contentDelay ?? DEFAULT_MODAL_CONTENT_DELAY;
  const resolvedDeferContent = deferContent ?? rootControl?.deferContent ?? true;
  const hasBackdropControl =
    rootControl != null ||
    defaultOpen !== undefined ||
    isOpen !== undefined ||
    onOpenChange != null;
  const [innerOpen, setInnerOpen] = useState(Boolean(resolvedDefaultOpen));
  const trackedOpen = resolvedIsOpen ?? innerOpen;
  const handleOpenChange = (nextOpen: boolean) => {
    if (resolvedIsOpen == null) {
      setInnerOpen(nextOpen);
    }
    resolvedOnOpenChange?.(nextOpen);
  };
  const overlayControlProps = hasBackdropControl
    ? {
        defaultOpen: resolvedDefaultOpen,
        isOpen: resolvedIsOpen,
        onOpenChange: handleOpenChange,
      }
    : {};

  return (
    <DeferredOverlayProvider
      delay={resolvedContentDelay}
      enabled={resolvedDeferContent}
      isOpen={hasBackdropControl ? trackedOpen : true}
    >
      <HeroModal.Backdrop {...props} {...overlayControlProps}>
        {children}
      </HeroModal.Backdrop>
    </DeferredOverlayProvider>
  );
}

export const Modal = Object.assign(ModalRoot, {
  Backdrop: ModalBackdrop,
  Body: HeroModal.Body,
  CloseTrigger: HeroModal.CloseTrigger,
  Container: HeroModal.Container,
  DeferredContent,
  Dialog: HeroModal.Dialog,
  Footer: HeroModal.Footer,
  Header: HeroModal.Header,
  Heading: HeroModal.Heading,
  Icon: HeroModal.Icon,
  Root: ModalRoot,
  Trigger: HeroModal.Trigger,
});

export type { ModalRootProps };
