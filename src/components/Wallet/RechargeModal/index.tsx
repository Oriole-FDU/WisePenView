/**
 * 通用充值弹窗（点卡核销）。
 *
 * 交互要点（与需求文档一致）：
 * - 展示格式：每满 4 位自动插入横杠，最多 16 位字母数字。
 * - 强制大写：输入阶段即转大写，避免用户混淆。
 * - 提交：剔除横杠与空格，仅传 16 位纯字符。
 * - 防重复提交：进行中按钮文案为「充值中...」并禁用。
 */
import React, { useState } from 'react';
import { Input, Modal } from 'antd';
import { useRequest } from 'ahooks';
import type { RechargeModalProps } from './index.type';
import styles from './style.module.less';

/** 将用户输入规范为「XXXX-XXXX-XXXX-XXXX」展示串（不含第 17 位及以后） */
const formatVoucherDisplay = (raw: string): string => {
  const alnum = raw
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(0, 16)
    .toUpperCase();
  const parts = alnum.match(/.{1,4}/g) ?? [];
  return parts.join('-');
};

/** 与后端 redeemVoucher 对齐：仅 16 位大写字母数字，无分隔符 */
const toSubmitCode = (display: string): string => display.replace(/[^A-Z0-9]/gi, '').toUpperCase();

const RechargeModal: React.FC<RechargeModalProps> = ({
  open,
  onCancel,
  groupDisplayName,
  onSubmit,
}) => {
  const [value, setValue] = useState('');

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  const title =
    groupDisplayName != null && groupDisplayName.length > 0
      ? `为「${groupDisplayName}」充值`
      : '个人充值';

  const { loading: submitting, run: runRecharge } = useRequest(
    async (code: string) => onSubmit(code),
    {
      manual: true,
      onSuccess: () => {
        handleCancel();
      },
    }
  );

  const handleOk = () => {
    const code = toSubmitCode(value);
    if (code.length !== 16) {
      return;
    }
    runRecharge(code);
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={handleCancel}
      onOk={() => void handleOk()}
      okText={submitting ? '充值中...' : '确认充值'}
      okButtonProps={{
        disabled: toSubmitCode(value).length !== 16 || submitting,
        loading: submitting,
      }}
      destroyOnHidden
    >
      <Input
        size="large"
        value={value}
        onChange={(e) => setValue(formatVoucherDisplay(e.target.value))}
        placeholder="XXXX-XXXX-XXXX-XXXX"
        maxLength={19}
        autoComplete="off"
        spellCheck={false}
      />
      <p className={styles.hint}>请输入 16 位兑换码，将自动转为大写并分段显示。</p>
    </Modal>
  );
};

export default RechargeModal;
