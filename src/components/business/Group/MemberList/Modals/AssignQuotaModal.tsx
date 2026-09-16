import { Alert, toast } from '@heroui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppModal from '@/components/base/AppModal';
import { AppButton } from '@/components/base/Button';
import { FormField, Input } from '@/components/base/Input';
import SelectedMemberList from '@/components/business/SelectedMemberList';
import { useQuotaService } from '@/domains';
import { useApi } from '@/hooks/useApi';

import type { AssignQuotaModalProps } from './index.type';
import styles from './style.module.less';
import { useMemberEditGuard } from './useMemberEditGuard';

const GROUP_MEMBER_TOKEN_LIMIT_MAX = 100_000_000;

interface QuotaInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  errorMessage?: string;
}

function QuotaInput({
  value,
  onChange,
  min,
  max,
  disabled,
  placeholder,
  className,
  errorMessage,
}: QuotaInputProps) {
  const { t } = useTranslation('group');
  return (
    <div className={className}>
      <FormField
        label={t('quota.assign.limitLabel')}
        aria-label={t('quota.assign.limitAria')}
        value={value != null ? String(value) : ''}
        onChange={(nextValue) => {
          if (nextValue === '') {
            onChange?.(null);
            return;
          }
          const parsed = Number(nextValue);
          onChange?.(Number.isFinite(parsed) ? parsed : null);
        }}
        isDisabled={disabled}
        aria-invalid={Boolean(errorMessage)}
      >
        <Input type="number" min={min} max={max} step={1} placeholder={placeholder} />
      </FormField>
      {errorMessage ? <div className={styles.fieldError}>{errorMessage}</div> : null}
    </div>
  );
}

function AssignQuotaModal({
  isOpen,
  onOpenChange,
  onSuccess,
  groupId,
  memberIds,
  members,
  groupDisplayConfig,
}: AssignQuotaModalProps) {
  const { i18n, t } = useTranslation(['group', 'common']);
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const quotaService = useQuotaService();
  const [quotaValue, setQuotaValue] = useState<number | null>(null);
  const [quotaError, setQuotaError] = useState('');
  const [groupQuota, setGroupQuotaState] = useState<{ used: number; limit: number }>({
    used: 0,
    limit: 0,
  });

  const maxUsed = Math.max(0, ...members.map((m) => m.used ?? 0));
  const quotaMin = Math.max(1, maxUsed);
  const quotaOverGlobalMax = maxUsed > GROUP_MEMBER_TOKEN_LIMIT_MAX;
  const { canEdit, confirmDisabled } = useMemberEditGuard(
    members,
    groupDisplayConfig.editableRolesForQuota,
    { checkOwner: false, forQuota: true }
  );

  const { loading, run: runSetQuota } = useApi(
    async (value: number) =>
      quotaService.setGroupQuota({
        groupId,
        targetUserIds: memberIds,
        newTokenLimit: Math.min(Math.floor(value), GROUP_MEMBER_TOKEN_LIMIT_MAX),
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(t('quota.assign.success', { count: memberIds.length }));
        setQuotaValue(null);
        setQuotaError('');
        onSuccess?.();
        onOpenChange(false);
      },
    }
  );
  useApi(() => quotaService.fetchGroupQuota(groupId), {
    ready: isOpen,
    refreshDeps: [groupId, isOpen],
    onSuccess: setGroupQuotaState,
    showErrorToast: false,
    onErrorEffect: () => setGroupQuotaState({ used: 0, limit: 0 }),
  });

  const validateQuota = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) {
      return t('quota.assign.required');
    }
    if (value <= 0) {
      return t('quota.assign.positive');
    }
    if (value < maxUsed) {
      return t('quota.assign.belowUsage', { used: maxUsed.toLocaleString(locale) });
    }
    if (value > GROUP_MEMBER_TOKEN_LIMIT_MAX) {
      return t('quota.assign.overLimit', {
        limit: GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString(locale),
      });
    }
    return '';
  };

  const handleConfirm = () => {
    const error = validateQuota(quotaValue);
    setQuotaError(error);
    if (error) {
      toast.warning(error);
      return;
    }
    runSetQuota(quotaValue!);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (loading) return;
      setQuotaValue(null);
      setQuotaError('');
      onOpenChange(false);
    }
  };

  return (
    <AppModal
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      title={t('quota.assign.title')}
      size="md"
      isDismissable={!loading}
      actions={
        <>
          <AppButton
            variant="secondary"
            isDisabled={loading}
            onPress={() => handleOpenChange(false)}
          >
            {t('actions.cancel', { ns: 'common' })}
          </AppButton>
          <AppButton
            variant="primary"
            isDisabled={loading || confirmDisabled || quotaOverGlobalMax}
            aria-busy={loading || undefined}
            onPress={handleConfirm}
          >
            {t('actions.confirm', { ns: 'common' })}
          </AppButton>
        </>
      }
    >
      <div className={styles.modalFormPadding}>
        {!canEdit && (
          <Alert status="danger" className={styles.alertBlock}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{t('quota.assign.unauthorized')}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        {quotaOverGlobalMax && (
          <Alert status="warning" className={styles.alertBlock}>
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                {t('quota.assign.usageOverLimit', {
                  limit: GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString(locale),
                })}
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <div className={styles.quotaInfo}>
          {t('quota.assign.groupUsage', {
            used: groupQuota.used.toLocaleString(locale),
            limit: groupQuota.limit.toLocaleString(locale),
            memberLimit: GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString(locale),
          })}
        </div>
        <QuotaInput
          className={styles.fullWidth}
          value={quotaValue}
          onChange={(nextValue) => {
            setQuotaValue(nextValue);
            if (quotaError) {
              setQuotaError(validateQuota(nextValue));
            }
          }}
          placeholder={t('member.table.integerPlaceholder')}
          min={quotaOverGlobalMax ? 1 : quotaMin}
          max={GROUP_MEMBER_TOKEN_LIMIT_MAX}
          disabled={quotaOverGlobalMax}
          errorMessage={quotaError}
        />
        <SelectedMemberList members={members} />
      </div>
    </AppModal>
  );
}

export default AssignQuotaModal;
