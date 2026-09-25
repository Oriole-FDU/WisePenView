import { clsx } from 'clsx';
import type { ReactNode } from 'react';

import { Modal } from '@/components/base/Modal';

import type { AppModalBodyProps, AppModalFooterProps, AppModalProps } from './index.type';
import styles from './style.module.less';

function AppModalBody({ className, ...props }: AppModalBodyProps) {
  return <Modal.Body className={clsx(styles.body, className)} {...props} />;
}

function AppModalFooter({ className, ...props }: AppModalFooterProps) {
  return <Modal.Footer className={clsx(styles.footer, className)} {...props} />;
}

function AppModalRoot({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  size = 'sm',
  placement = 'center',
  isDismissable = true,
  actions,
  footer,
  contentMode = 'body',
  contentDelay,
  deferContent,
  className,
  containerClassName,
  dialogClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  classNames,
}: AppModalProps) {
  const renderFooterContent = (): ReactNode => {
    if (footer === false || footer === null) return null;
    if (footer !== undefined) return footer;
    if (actions !== undefined) return actions;
    return null;
  };

  const footerContent = renderFooterContent();
  const shouldRenderFooter = footerContent != null;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentDelay={contentDelay}
      deferContent={deferContent}
    >
      <Modal.Backdrop isDismissable={isDismissable}>
        <Modal.Container
          size={size}
          placement={placement}
          className={clsx(styles.container, containerClassName, classNames?.container)}
        >
          <Modal.Dialog
            className={clsx(styles.dialog, className, dialogClassName, classNames?.dialog)}
          >
            {title || description ? (
              <Modal.Header className={clsx(styles.header, headerClassName, classNames?.header)}>
                {title ? (
                  <Modal.Heading className={clsx(styles.heading, classNames?.heading)}>
                    {title}
                  </Modal.Heading>
                ) : null}
                {description ? (
                  <div className={clsx(styles.description, classNames?.description)}>
                    {description}
                  </div>
                ) : null}
              </Modal.Header>
            ) : null}

            {contentMode === 'dialog' ? (
              children
            ) : (
              <AppModalBody className={clsx(bodyClassName, classNames?.body)}>
                {children}
              </AppModalBody>
            )}

            {shouldRenderFooter ? (
              <AppModalFooter className={clsx(footerClassName, classNames?.footer)}>
                {footerContent}
              </AppModalFooter>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export const AppModal = Object.assign(AppModalRoot, {
  Body: AppModalBody,
  DeferredContent: Modal.DeferredContent,
  Footer: AppModalFooter,
});

export default AppModal;
