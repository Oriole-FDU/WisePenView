import { useUserService } from '@/domains';
import type { ConfirmEmailVerifyRequest } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import { Button, Modal, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import auth from '../Auth.module.less';

function VerifyEmail() {
  const userService = useUserService();
  const { t } = useTranslation('auth');
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const { loading, run: runVerify } = useRequest(
    (verifyToken: string) => {
      const params: ConfirmEmailVerifyRequest = { token: verifyToken };
      return userService.confirmEmailVerify(params);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('verifyEmail.verifySuccess'));
        setSuccessModalOpen(true);
      },
      onError: (err: unknown) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const onVerify = () => {
    if (loading || !token) {
      if (!token) toast.danger(t('verifyEmail.invalidToken'));
      return;
    }
    runVerify(token);
  };

  const goToAccount = () => {
    setSuccessModalOpen(false);
    navigate('/app/profile/account', { replace: true, state: { fromVerify: true } });
  };

  return (
    <div className={auth.authContainer}>
      <h1>{t('verifyEmail.title')}</h1>
      <div className="mt-3 rounded-medium bg-primary/10 px-4 py-3 text-sm text-primary">
        {t('verifyEmail.alertDescription')}
      </div>
      <div className="mt-6">
        <Button
          variant="primary"
          className={auth.submitButton}
          isDisabled={loading || !token}
          onPress={onVerify}
        >
          {t('verifyEmail.submit')}
        </Button>
      </div>
      <Modal isOpen={successModalOpen} onOpenChange={(open) => !open && goToAccount()}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="sm" placement="center">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>{t('verifyEmail.successTitle')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p>{t('verifyEmail.successDescription')}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="primary" onPress={goToAccount}>
                  {t('verifyEmail.goToAccount')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}

export default VerifyEmail;
