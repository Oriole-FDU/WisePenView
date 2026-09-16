import { CircleAlert, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { cn } from '@/utils/cn';

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
  return <Modal.Body className={cn(styles.body, className)} {...props} />;
}

function AppAlertDialogFooter({ className, ...props }: AppAlertDialogFooterProps) {
  return <Modal.Footer className={cn(styles.footer, className)} {...props} />;
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
  contentDelay,
  deferContent,
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
  const resolvedIcon =
    icon === undefined ? (
      type === 'danger' ? (
        <CircleAlert size={20} aria-hidden />
      ) : type === 'warning' ? (
        <TriangleAlert size={20} aria-hidden />
      ) : null
    ) : (
      icon
    );
  const hasIcon = resolvedIcon !== undefined && resolvedIcon !== null && resolvedIcon !== false;

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
        <AppButton variant="secondary" isDisabled={isConfirmLoading} onPress={handleCancel}>
          {cancelText ?? t('actions.cancel')}
        </AppButton>
        <AppButton
          variant={isDanger ? 'danger' : 'primary'}
          isDisabled={isConfirmDisabled || isConfirmLoading}
          aria-busy={isConfirmLoading || undefined}
          onPress={handleConfirm}
        >
          {confirmText ?? t('actions.confirm')}
        </AppButton>
      </>
    );
  };

  const footerContent = renderFooterContent();

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      contentDelay={contentDelay}
      deferContent={deferContent}
    >
      <Modal.Backdrop
        className={cn(backdropClassName, classNames?.backdrop)}
        isDismissable={canDismiss}
        isKeyboardDismissDisabled={!canDismiss}
      >
        <Modal.Container
          size={size}
          placement={placement}
          className={cn(styles.container, containerClassName, classNames?.container)}
        >
          <Modal.Dialog
            className={cn(styles.dialog, className, dialogClassName, classNames?.dialog)}
          >
            <Modal.Header className={cn(styles.header, classNames?.header)}>
              {hasIcon ? (
                <Modal.Icon
                  className={cn(styles.icon, classNames?.icon)}
                  data-status={status}
                  aria-hidden
                >
                  {resolvedIcon}
                </Modal.Icon>
              ) : null}
              <div className={styles.headerContent}>
                <Modal.Heading className={cn(styles.heading, classNames?.heading)}>
                  {title}
                </Modal.Heading>
                {description ? (
                  <div className={cn(styles.description, classNames?.description)}>
                    {description}
                  </div>
                ) : null}
              </div>
            </Modal.Header>

            {children != null ? (
              <AppAlertDialogBody className={cn(bodyClassName, classNames?.body)}>
                {children}
              </AppAlertDialogBody>
            ) : null}

            {footerContent != null && footerContent !== false ? (
              <AppAlertDialogFooter className={cn(footerClassName, classNames?.footer)}>
                {footerContent}
              </AppAlertDialogFooter>
            ) : null}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export const AppAlertDialog = Object.assign(AppAlertDialogRoot, {
  Body: AppAlertDialogBody,
  CloseTrigger: Modal.CloseTrigger,
  DeferredContent: Modal.DeferredContent,
  Footer: AppAlertDialogFooter,
  Header: Modal.Header,
  Heading: Modal.Heading,
  Icon: Modal.Icon,
});

export default AppAlertDialog;
