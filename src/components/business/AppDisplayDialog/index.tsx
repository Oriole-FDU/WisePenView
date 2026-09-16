import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { cn } from '@/utils/cn';

import type {
  AppDisplayDialogAction,
  AppDisplayDialogBodyProps,
  AppDisplayDialogFooterProps,
  AppDisplayDialogProps,
} from './index.type';
import styles from './style.module.less';

function AppDisplayDialogBody({ className, ...props }: AppDisplayDialogBodyProps) {
  return <Modal.Body className={cn(styles.body, className)} {...props} />;
}

function AppDisplayDialogFooter({ className, ...props }: AppDisplayDialogFooterProps) {
  return <Modal.Footer className={cn(styles.footer, className)} {...props} />;
}

function renderAction(
  action: AppDisplayDialogAction,
  defaultVariant: AppDisplayDialogAction['variant']
) {
  const { label, icon, variant = defaultVariant, ...buttonProps } = action;
  return (
    <AppButton variant={variant} {...buttonProps}>
      {icon}
      {label}
    </AppButton>
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
        <AppButton variant="primary" onPress={handleClose}>
          {resolvedCloseText}
        </AppButton>
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
          className={cn(styles.container, containerClassName, classNames?.container)}
        >
          <Modal.Dialog
            className={cn(styles.dialog, className, dialogClassName, classNames?.dialog)}
          >
            {hasCloseTrigger ? (
              <Modal.CloseTrigger
                aria-label={t('overlay.closeAria')}
                className={cn(styles.closeTrigger, closeTriggerClassName, classNames?.closeTrigger)}
              >
                <X size={16} aria-hidden />
              </Modal.CloseTrigger>
            ) : null}
            <Modal.Header
              className={cn(
                styles.header,
                hasCloseTrigger && styles.headerWithCloseTrigger,
                headerClassName,
                classNames?.header
              )}
            >
              <Modal.Heading className={cn(styles.heading, classNames?.heading)}>
                {title}
              </Modal.Heading>
              {description ? (
                <div className={cn(styles.description, classNames?.description)}>{description}</div>
              ) : null}
            </Modal.Header>

            <AppDisplayDialogBody className={cn(bodyClassName, classNames?.body)}>
              {children}
            </AppDisplayDialogBody>

            {footerContent != null ? (
              <AppDisplayDialogFooter className={cn(footerClassName, classNames?.footer)}>
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
