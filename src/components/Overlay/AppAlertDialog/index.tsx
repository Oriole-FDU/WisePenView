import { AlertDialog, Button } from '@heroui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type {
  AppAlertDialogBodyProps,
  AppAlertDialogFooterProps,
  AppAlertDialogProps,
  AppAlertDialogStatus,
  AppAlertDialogType,
} from './index.type';
import styles from './style.module.less';

const DEFAULT_TYPE: AppAlertDialogType = 'confirm';

const STATUS_MAP = {
  confirm: 'default',
  warning: 'warning',
  danger: 'danger',
} satisfies Record<AppAlertDialogType, AppAlertDialogStatus>;

function AppAlertDialogBody({ className, ...props }: AppAlertDialogBodyProps) {
  return <AlertDialog.Body className={clsx(styles.body, className)} {...props} />;
}

function AppAlertDialogFooter({ className, ...props }: AppAlertDialogFooterProps) {
  return <AlertDialog.Footer className={clsx(styles.footer, className)} {...props} />;
}

function AppAlertDialogRoot({
  type = DEFAULT_TYPE,
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  isConfirmLoading = false,
  isConfirmDisabled = false,
  isDismissable = false,
  size = 'sm',
  placement = 'center',
  icon,
  actions,
  footer,
  className,
  backdropClassName,
  containerClassName,
  dialogClassName,
  bodyClassName,
  footerClassName,
  classNames,
}: AppAlertDialogProps) {
  const { t } = useTranslation('common');
  const status = STATUS_MAP[type];
  const isDanger = type === 'danger';
  const canDismiss = isDismissable && !isConfirmLoading;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isConfirmLoading) return;
    onOpenChange(nextOpen);
  };

  const handleCancel = () => {
    if (isConfirmLoading) return;
    if (onCancel) {
      onCancel();
      return;
    }
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (isConfirmLoading || isConfirmDisabled) return;
    onConfirm?.();
  };

  const renderFooterContent = (): ReactNode => {
    if (footer === false || footer === null) return null;
    if (footer !== undefined) return footer;
    if (actions !== undefined) return actions;

    return (
      <>
        <Button variant="secondary" isDisabled={isConfirmLoading} onPress={handleCancel}>
          {cancelText ?? t('actions.cancel')}
        </Button>
        <Button
          variant={isDanger ? 'danger' : 'primary'}
          isDisabled={isConfirmDisabled || isConfirmLoading}
          aria-busy={isConfirmLoading || undefined}
          onPress={handleConfirm}
        >
          {confirmText ?? t('actions.confirm')}
        </Button>
      </>
    );
  };

  const footerContent = renderFooterContent();

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialog.Backdrop
        className={clsx(backdropClassName, classNames?.backdrop)}
        isDismissable={canDismiss}
        isKeyboardDismissDisabled={!canDismiss}
      >
        <AlertDialog.Container
          size={size}
          placement={placement}
          className={clsx(styles.container, containerClassName, classNames?.container)}
        >
          <AlertDialog.Dialog
            className={clsx(styles.dialog, className, dialogClassName, classNames?.dialog)}
          >
            <AlertDialog.Header className={clsx(styles.header, classNames?.header)}>
              {icon === false ? null : (
                <AlertDialog.Icon
                  status={status}
                  className={clsx(styles.icon, classNames?.icon)}
                  aria-hidden
                >
                  {icon}
                </AlertDialog.Icon>
              )}
              <div className={styles.headerContent}>
                <AlertDialog.Heading className={clsx(styles.heading, classNames?.heading)}>
                  {title}
                </AlertDialog.Heading>
                {description ? (
                  <div className={clsx(styles.description, classNames?.description)}>
                    {description}
                  </div>
                ) : null}
              </div>
            </AlertDialog.Header>

            {children != null ? (
              <AppAlertDialogBody className={clsx(bodyClassName, classNames?.body)}>
                {children}
              </AppAlertDialogBody>
            ) : null}

            {footerContent != null && footerContent !== false ? (
              <AppAlertDialogFooter className={clsx(footerClassName, classNames?.footer)}>
                {footerContent}
              </AppAlertDialogFooter>
            ) : null}
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

export const AppAlertDialog = Object.assign(AppAlertDialogRoot, {
  Body: AppAlertDialogBody,
  CloseTrigger: AlertDialog.CloseTrigger,
  Footer: AppAlertDialogFooter,
  Header: AlertDialog.Header,
  Heading: AlertDialog.Heading,
  Icon: AlertDialog.Icon,
});

export default AppAlertDialog;
