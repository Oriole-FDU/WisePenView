import { Form, Tabs } from '@heroui/react';
import { Mail, ShieldUser } from 'lucide-react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { FormField, Input, InputGroup } from '@/components/base/Input';

import type { VerifyFormErrors, VerifyModalMode } from './index.type';
import styles from './style.module.less';

export interface AccountVerificationFormProps {
  formId?: string;
  verifyMode: VerifyModalMode;
  email: string;
  uisAccount: string;
  uisPassword: string;
  verifyFormErrors: VerifyFormErrors;
  onModeChange: (mode: VerifyModalMode) => void;
  onEmailChange: (email: string) => void;
  onUisAccountChange: (account: string) => void;
  onUisPasswordChange: (password: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function AccountVerificationForm({
  formId,
  verifyMode,
  email,
  uisAccount,
  uisPassword,
  verifyFormErrors,
  onModeChange,
  onEmailChange,
  onUisAccountChange,
  onUisPasswordChange,
  onSubmit,
}: AccountVerificationFormProps) {
  const { t } = useTranslation('profile');

  return (
    <>
      <Tabs
        className={styles.verifyModeTabs}
        selectedKey={verifyMode}
        onSelectionChange={(nextMode) => onModeChange(String(nextMode) as VerifyModalMode)}
      >
        <Tabs.ListContainer className={styles.verifyModeTabsListContainer}>
          <Tabs.List
            className={styles.verifyModeTabsList}
            aria-label={t('verification.methodAria')}
          >
            <Tabs.Tab className={styles.verifyModeTab} id="uis">
              {t('verification.uisTab')}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab className={styles.verifyModeTab} id="email">
              {t('verification.emailTab')}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <Form id={formId} onSubmit={onSubmit} className={styles.verifyForm}>
        {verifyMode === 'email' ? (
          <FormField
            label={t('verification.emailLabel')}
            value={email}
            onChange={onEmailChange}
            isInvalid={verifyFormErrors.email != null}
            errorMessage={verifyFormErrors.email}
            name="email"
          >
            <InputGroup>
              <InputGroup.Prefix>
                <Mail size={18} className={styles.verifyInputIcon} />
              </InputGroup.Prefix>
              <InputGroup.Input type="email" placeholder={t('verification.emailPlaceholder')} />
            </InputGroup>
          </FormField>
        ) : (
          <>
            <FormField
              label={t('verification.uisAccountLabel')}
              value={uisAccount}
              onChange={onUisAccountChange}
              isInvalid={verifyFormErrors.uisAccount != null}
              errorMessage={verifyFormErrors.uisAccount}
              name="uisAccount"
            >
              <InputGroup>
                <InputGroup.Prefix>
                  <ShieldUser size={18} className={styles.verifyInputIcon} />
                </InputGroup.Prefix>
                <InputGroup.Input
                  placeholder={t('verification.uisAccountPlaceholder')}
                  autoComplete="username"
                />
              </InputGroup>
            </FormField>
            <FormField
              label={t('verification.uisPasswordLabel')}
              value={uisPassword}
              onChange={onUisPasswordChange}
              isInvalid={verifyFormErrors.uisPassword != null}
              errorMessage={verifyFormErrors.uisPassword}
              name="uisPassword"
            >
              <Input
                type="password"
                placeholder={t('verification.uisPasswordLabel')}
                autoComplete="current-password"
              />
            </FormField>
          </>
        )}
      </Form>
    </>
  );
}

export default AccountVerificationForm;
