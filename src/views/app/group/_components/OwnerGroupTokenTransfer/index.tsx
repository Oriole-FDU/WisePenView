/**
 * 高级组组长：个人计算点与小组池之间的 Token 划拨（transferTokenBetweenGroupAndUser）。
 */
import { Input } from '@/components/Input';
import { useGroupService, useWalletService } from '@/domains';
import { WALLET_TOKEN_TRANSFER_TYPE } from '@/domains/Wallet';
import { parseErrorMessage } from '@/utils/error';
import { Button, Skeleton, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { OwnerGroupTokenTransferProps } from './index.type';
import styles from './style.module.less';

function OwnerGroupTokenTransfer({ groupId, onTransferSuccess }: OwnerGroupTokenTransferProps) {
  const { i18n, t } = useTranslation('wallet');
  const locale = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';
  const walletService = useWalletService();
  const groupService = useGroupService();
  const [personalBal, setPersonalBal] = useState(0);
  const [groupBal, setGroupBal] = useState(0);
  const [amtToGroup, setAmtToGroup] = useState<number | null>(null);
  const [amtToOwner, setAmtToOwner] = useState<number | null>(null);

  const { loading: balanceLoading, runAsync: loadBalances } = useRequest(
    async () => {
      const gid = groupId?.trim();
      if (!gid) {
        return null;
      }
      const [personalRes, groupRes] = await Promise.all([
        walletService.getUserWalletInfo(),
        groupService.getGroupWalletInfo({ groupId: gid }),
      ]);
      return { personalBal: personalRes.balance, groupBal: groupRes };
    },
    {
      ready: Boolean(groupId?.trim()),
      refreshDeps: [groupId, walletService],
      onSuccess: (res) => {
        if (!res) return;
        setPersonalBal(res.personalBal);
        setGroupBal(res.groupBal);
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const refreshAfterTransfer = async () => {
    await loadBalances();
    onTransferSuccess?.();
  };

  const { loading: submittingToGroup, runAsync: runTransferToGroup } = useRequest(
    async (amount: number) =>
      walletService.transferTokenBetweenGroupAndUser({
        groupId,
        tokenCount: amount,
        tokenTransferType: WALLET_TOKEN_TRANSFER_TYPE.TO_GROUP,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success(t('transfer.toGroupSuccess'));
        setAmtToGroup(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const { loading: submittingToOwner, runAsync: runTransferToOwner } = useRequest(
    async (amount: number) =>
      walletService.transferTokenBetweenGroupAndUser({
        groupId,
        tokenCount: amount,
        tokenTransferType: WALLET_TOKEN_TRANSFER_TYPE.TO_OWNER,
      }),
    {
      manual: true,
      onSuccess: async () => {
        toast.success(t('transfer.toOwnerSuccess'));
        setAmtToOwner(null);
        await refreshAfterTransfer();
      },
      onError: (err) => {
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const handleGiveToGroup = async () => {
    const n = amtToGroup;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      toast.warning(t('transfer.invalidAmount'));
      return;
    }
    if (n > personalBal) {
      toast.warning(t('transfer.ownerInsufficient'));
      return;
    }
    await runTransferToGroup(Math.floor(n));
  };

  const handleGiveToOwner = async () => {
    const n = amtToOwner;
    if (n == null || !Number.isFinite(n) || n <= 0) {
      toast.warning(t('transfer.invalidAmount'));
      return;
    }
    if (n > groupBal) {
      toast.warning(t('transfer.groupInsufficient'));
      return;
    }
    await runTransferToOwner(Math.floor(n));
  };

  if (!groupId?.trim()) {
    return <div className={styles.card}>{t('transfer.missingGroup')}</div>;
  }

  return (
    <div className={styles.card}>
      <p className={styles.intro}>{t('transfer.intro')}</p>

      <div className={styles.balanceHeader}>
        <h3 className={styles.balanceTitle}>{t('transfer.currentBalance')}</h3>
        <Button onPress={() => void loadBalances()} isDisabled={balanceLoading}>
          {t('transfer.refresh')}
        </Button>
      </div>
      <div className={styles.balanceRow}>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>{t('transfer.ownerBalance')}</p>
          {balanceLoading ? (
            <Skeleton className={styles.balanceSkeleton} />
          ) : (
            <p className={styles.balanceValue}>
              {personalBal.toLocaleString(locale)}
              <span className={styles.unit}>{t('transfer.unit')}</span>
            </p>
          )}
        </div>
        <div className={styles.balanceItem}>
          <p className={styles.balanceLabel}>{t('transfer.groupBalance')}</p>
          {balanceLoading ? (
            <Skeleton className={styles.balanceSkeleton} />
          ) : (
            <p className={styles.balanceValue}>
              {groupBal.toLocaleString(locale)}
              <span className={styles.unit}>{t('transfer.unit')}</span>
            </p>
          )}
        </div>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>{t('transfer.toGroupTitle')}</h4>
      <div className={styles.formRow}>
        <TextField
          aria-label={t('transfer.toGroupAria')}
          className={styles.amountInput}
          value={amtToGroup != null ? String(amtToGroup) : ''}
          onChange={(nextValue) => {
            if (nextValue === '') {
              setAmtToGroup(null);
              return;
            }
            const parsed = Number(nextValue);
            setAmtToGroup(Number.isFinite(parsed) ? parsed : null);
          }}
          isDisabled={submittingToGroup || balanceLoading}
        >
          <Input
            type="number"
            min={1}
            max={personalBal > 0 ? personalBal : undefined}
            step={1}
            placeholder={t('transfer.amountPlaceholder')}
          />
        </TextField>
        <Button
          variant="primary"
          isDisabled={submittingToGroup || balanceLoading}
          onPress={() => void handleGiveToGroup()}
        >
          {t('transfer.toGroupConfirm')}
        </Button>
      </div>

      <hr className={styles.divider} />

      <h4 className={styles.transferTitle}>{t('transfer.toOwnerTitle')}</h4>
      <div className={styles.formRow}>
        <TextField
          aria-label={t('transfer.toOwnerAria')}
          className={styles.amountInput}
          value={amtToOwner != null ? String(amtToOwner) : ''}
          onChange={(nextValue) => {
            if (nextValue === '') {
              setAmtToOwner(null);
              return;
            }
            const parsed = Number(nextValue);
            setAmtToOwner(Number.isFinite(parsed) ? parsed : null);
          }}
          isDisabled={submittingToOwner || balanceLoading}
        >
          <Input
            type="number"
            min={1}
            max={groupBal > 0 ? groupBal : undefined}
            step={1}
            placeholder={t('transfer.amountPlaceholder')}
          />
        </TextField>
        <Button
          variant="primary"
          isDisabled={submittingToOwner || balanceLoading}
          onPress={() => void handleGiveToOwner()}
        >
          {t('transfer.toOwnerConfirm')}
        </Button>
      </div>
    </div>
  );
}

export default OwnerGroupTokenTransfer;
