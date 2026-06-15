import SelectedMemberList from '@/components/Common/SelectedMemberList';
import { useQuotaService } from '@/domains';
import { useEffectForce } from '@/hooks/useEffectForce';
import { parseErrorMessage } from '@/utils/error';
import { Alert, Button, Input, Label, Modal, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
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
  return (
    <div className={className}>
      <TextField
        aria-label="配额限额"
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
        <Label>配额限额</Label>
        <Input type="number" min={min} max={max} step={1} placeholder={placeholder} />
      </TextField>
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

  const { loading, run: runSetQuota } = useRequest(
    async (value: number) =>
      quotaService.setGroupQuota({
        groupId,
        targetUserIds: memberIds,
        newTokenLimit: Math.min(Math.floor(value), GROUP_MEMBER_TOKEN_LIMIT_MAX),
      }),
    {
      manual: true,
      onSuccess: () => {
        toast.success(`已为 ${memberIds.length} 位成员分配配额`);
        setQuotaValue(null);
        setQuotaError('');
        onSuccess?.();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const validateQuota = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) {
      return '请输入配额限额';
    }
    if (value <= 0) {
      return '配额必须大于0';
    }
    if (value < maxUsed) {
      return `不能小于成员当前用量（最大：${maxUsed.toLocaleString()}）`;
    }
    if (value > GROUP_MEMBER_TOKEN_LIMIT_MAX) {
      return `不能超过 ${GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}`;
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

  useEffectForce(() => {
    if (!isOpen) return;
    setQuotaValue(null);
    setQuotaError('');
    quotaService
      .fetchGroupQuota(groupId)
      .then(setGroupQuotaState)
      .catch(() => setGroupQuotaState({ used: 0, limit: 0 }));
  }, [isOpen, groupId, quotaService]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (loading) return;
      onOpenChange(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={handleOpenChange}>
      <Modal.Backdrop isDismissable={!loading}>
        <Modal.Container size="md" placement="center">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>分配配额</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className={styles.modalFormPadding}>
                {!canEdit && (
                  <Alert status="danger" className={styles.alertBlock}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>您不能分配组长/管理员的配额。</Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                {quotaOverGlobalMax && (
                  <Alert status="warning" className={styles.alertBlock}>
                    <Alert.Indicator />
                    <Alert.Content>
                      <Alert.Description>
                        {`成员当前用量已超过允许设置的上限（${GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}），无法在此调整配额。`}
                      </Alert.Description>
                    </Alert.Content>
                  </Alert>
                )}
                <div className={styles.quotaInfo}>
                  小组配额使用：{groupQuota.used.toLocaleString()} /{' '}
                  {groupQuota.limit.toLocaleString()} 计算点（单成员限额不超过{' '}
                  {GROUP_MEMBER_TOKEN_LIMIT_MAX.toLocaleString()}）
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
                  placeholder="请输入整数"
                  min={quotaOverGlobalMax ? 1 : quotaMin}
                  max={GROUP_MEMBER_TOKEN_LIMIT_MAX}
                  disabled={quotaOverGlobalMax}
                  errorMessage={quotaError}
                />
                <SelectedMemberList members={members} />
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onPress={() => onOpenChange(false)} isDisabled={loading}>
                取消
              </Button>
              <Button
                variant="primary"
                onPress={handleConfirm}
                isDisabled={loading || confirmDisabled || quotaOverGlobalMax}
              >
                确定
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export default AssignQuotaModal;
