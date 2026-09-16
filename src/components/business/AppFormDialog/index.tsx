import { Form } from '@heroui/react';
import type { FormEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';
import { Modal } from '@/components/base/Modal';
import { cn } from '@/utils/cn';

import type { AppFormDialogProps } from './index.type';
import styles from './style.module.less';

function AppFormDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  confirmText,
  cancelText,
  onSubmit,
  onCancel,
  isSubmitting = false,
  isSubmitDisabled = false,
  isDismissable = true,
  size = 'sm',
  placement = 'center',
  contentDelay,
  deferContent,
  actions,
  footer,
  formId,
  className,
  backdropClassName,
  containerClassName,
  dialogClassName,
  formClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  classNames,
}: AppFormDialogProps) {
  const { t } = useTranslation('common');
  const canDismiss = isDismissable && !isSubmitting;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return;
    onOpenChange(nextOpen);
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    if (onCancel) {
      onCancel();
      return;
    }
    onOpenChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSubmitDisabled) return;
    onSubmit?.(event);
  };

  const handleSubmitCapture = (event: FormEvent<HTMLDivElement>) => {
    // 先阻止浏览器默认 GET 提交，避免子内容拦截冒泡时将表单字段写入当前 URL。
    event.preventDefault();
  };

  const renderFooterContent = (): ReactNode => {
    if (footer === false || footer === null) return null;
    if (footer !== undefined) return footer;
    if (actions !== undefined) return actions;

    return (
      <>
        <AppButton
          type="button"
          variant="secondary"
          isDisabled={isSubmitting}
          onPress={handleCancel}
        >
          {cancelText ?? t('actions.cancel')}
        </AppButton>
        <AppButton
          type="submit"
          variant="primary"
          isDisabled={isSubmitDisabled || isSubmitting}
          aria-busy={isSubmitting || undefined}
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
            <div className={styles.formCapture} onSubmitCapture={handleSubmitCapture}>
              <Form
                id={formId}
                className={cn(styles.form, formClassName, classNames?.form)}
                onSubmit={handleSubmit}
              >
                <Modal.Header className={cn(styles.header, headerClassName, classNames?.header)}>
                  <Modal.Heading className={cn(styles.heading, classNames?.heading)}>
                    {title}
                  </Modal.Heading>
                  {description ? (
                    <div className={cn(styles.description, classNames?.description)}>
                      {description}
                    </div>
                  ) : null}
                </Modal.Header>

                <Modal.Body className={cn(styles.body, bodyClassName, classNames?.body)}>
                  {children}
                </Modal.Body>

                {footerContent != null ? (
                  <Modal.Footer className={cn(styles.footer, footerClassName, classNames?.footer)}>
                    {footerContent}
                  </Modal.Footer>
                ) : null}
              </Form>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

const AppFormDialogComponent = Object.assign(AppFormDialog, {
  DeferredContent: Modal.DeferredContent,
});

export { AppFormDialogComponent as AppFormDialog };
export default AppFormDialogComponent;
