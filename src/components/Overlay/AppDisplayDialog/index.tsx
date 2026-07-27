import { Button } from '@heroui/react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Modal } from '../Modal';
import type {
  AppDisplayDialogAction,
  AppDisplayDialogBodyProps,
  AppDisplayDialogFooterProps,
  AppDisplayDialogProps,
} from './index.type';
import styles from './style.module.less';

function AppDisplayDialogBody({ className, ...props }: AppDisplayDialogBodyProps) {
  return <Modal.Body className={clsx(styles.body, className)} {...props} />;
}

function AppDisplayDialogFooter({ className, ...props }: AppDisplayDialogFooterProps) {
  return <Modal.Footer className={clsx(styles.footer, className)} {...props} />;
}

function renderAction(
  action: AppDisplayDialogAction,
  defaultVariant: AppDisplayDialogAction['variant']
) {
  const { label, icon, variant = defaultVariant, ...buttonProps } = action;
  return (
    <Button variant={variant} {...buttonProps}>
      {icon}
      {label}
    </Button>
  );
}

function AppDisplayDialogRoot({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  closeText,
  primaryAction,
  secondaryAction,
  actions,
  footer,
  size = 'sm',
  placement = 'center',
  isDismissable = true,
  showCloseTrigger = true,
  contentDelay,
  deferContent,
  className,
  containerClassName,
  dialogClassName,
  closeTriggerClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  classNames,
}: AppDisplayDialogProps) {
  const { t } = useTranslation('common');
  const resolvedCloseText = closeText === undefined ? t('actions.close') : closeText;

  const handleClose = () => {
    onOpenChange(false);
  };

  const renderFooterContent = (): ReactNode => {
    if (footer === false || footer === null) return null;
    if (footer !== undefined) return footer;
    if (actions !== undefined) return actions;

    if (secondaryAction || primaryAction) {
      return (
        <>
          {secondaryAction ? renderAction(secondaryAction, 'secondary') : null}
          {primaryAction ? renderAction(primaryAction, 'primary') : null}
        </>
      );
    }

    if (resolvedCloseText !== false && resolvedCloseText != null) {
      return (
        <Button variant="primary" onPress={handleClose}>
          {resolvedCloseText}
        </Button>
      );
    }

    return null;
  };

  const footerContent = renderFooterContent();
  const hasCloseTrigger = showCloseTrigger && isDismissable;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentDelay={contentDelay}
      deferContent={deferContent}
    >
      <Modal.Backdrop isDismissable={isDismissable} isKeyboardDismissDisabled={!isDismissable}>
        <Modal.Container
          size={size}
          placement={placement}
          className={clsx(styles.container, containerClassName, classNames?.container)}
        >
          <Modal.Dialog
            className={clsx(styles.dialog, className, dialogClassName, classNames?.dialog)}
          >
            {hasCloseTrigger ? (
              <Modal.CloseTrigger
                aria-label={t('overlay.closeAria')}
                className={clsx(
                  styles.closeTrigger,
                  closeTriggerClassName,
                  classNames?.closeTrigger
                )}
              >
                <X size={16} aria-hidden />
              </Modal.CloseTrigger>
            ) : null}
            <Modal.Header
              className={clsx(
                styles.header,
                hasCloseTrigger && styles.headerWithCloseTrigger,
                headerClassName,
                classNames?.header
              )}
            >
              <Modal.Heading className={clsx(styles.heading, classNames?.heading)}>
                {title}
              </Modal.Heading>
              {description ? (
                <div className={clsx(styles.description, classNames?.description)}>
                  {description}
                </div>
              ) : null}
            </Modal.Header>

            <AppDisplayDialogBody className={clsx(bodyClassName, classNames?.body)}>
              {children}
            </AppDisplayDialogBody>

            {footerContent != null ? (
              <AppDisplayDialogFooter className={clsx(footerClassName, classNames?.footer)}>
                {footerContent}
              </AppDisplayDialogFooter>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export const AppDisplayDialog = Object.assign(AppDisplayDialogRoot, {
  Body: AppDisplayDialogBody,
  DeferredContent: Modal.DeferredContent,
  Footer: AppDisplayDialogFooter,
});

export default AppDisplayDialog;
