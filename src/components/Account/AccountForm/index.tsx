import React, { useMemo, useState } from 'react';
import { Button, Descriptions, Form, Input, Select } from 'antd';
import type { InputRef } from 'antd/es/input';
import { RiPencilLine } from 'react-icons/ri';
import {
  DEGREE_LEVEL_LABELS,
  getDegreeLevelLabel,
  getSexLabel,
  SEX_LABELS,
} from '@/constants/user';
import { useUserService } from '@/contexts/ServicesContext';
import type { UpdateUserInfoRequest } from '@/services/User';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { getProfileDisplayString } from './profileDisplay';
import type { AccountFormProps } from './index.type';
import { useAppMessage } from '@/hooks/useAppMessage';
import styles from './style.module.less';

const { Option } = Select;

const SexReadonlyInput = React.forwardRef<InputRef, { value?: number | null }>(({ value }, ref) => (
  <Input
    ref={ref}
    disabled
    readOnly
    value={value != null ? getSexLabel(value) : '-'}
    className={styles.editableInput}
  />
));
SexReadonlyInput.displayName = 'SexReadonlyInput';

const DegreeLevelReadonlyInput = React.forwardRef<InputRef, { value?: number | null }>(
  ({ value }, ref) => (
    <Input
      ref={ref}
      disabled
      readOnly
      value={value != null ? getDegreeLevelLabel(value) : '-'}
      className={styles.editableInput}
    />
  )
);
DegreeLevelReadonlyInput.displayName = 'DegreeLevelReadonlyInput';

const AccountForm: React.FC<AccountFormProps> = ({
  show,
  user,
  form,
  fieldConfig,
  visibleFields,
  readonlyFieldSet,
  editMode,
  onEditModeChange,
  onUserInfoUpdated,
  onCancel,
}) => {
  const userService = useUserService();
  const message = useAppMessage();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const rf = new Set(user?.readonlyFields ?? []);
      const params: UpdateUserInfoRequest = {
        nickname:
          fieldConfig.nickname && !rf.has('nickname')
            ? values.nickname
            : (user?.userInfo?.nickname ?? undefined),
        realName:
          fieldConfig.realName && !rf.has('realName')
            ? values.realName
            : (user?.userInfo?.realName ?? undefined),
        sex: fieldConfig.sex && !rf.has('sex') ? values.sex : user?.userProfile?.sex,
        university:
          fieldConfig.university && !rf.has('university')
            ? (values.university ?? null)
            : (user?.userProfile?.university ?? null),
        college:
          fieldConfig.college && !rf.has('college')
            ? values.college
            : (user?.userProfile?.college ?? undefined),
        major:
          fieldConfig.major && !rf.has('major')
            ? values.major
            : (user?.userProfile?.major ?? undefined),
        className:
          fieldConfig.className && !rf.has('className')
            ? values.className
            : (user?.userProfile?.className ?? undefined),
        enrollmentYear:
          fieldConfig.enrollmentYear && !rf.has('enrollmentYear')
            ? values.enrollmentYear
            : (user?.userProfile?.enrollmentYear ?? undefined),
        degreeLevel:
          fieldConfig.degreeLevel && !rf.has('degreeLevel')
            ? values.degreeLevel
            : typeof user?.userProfile?.degreeLevel === 'number'
              ? user.userProfile.degreeLevel
              : undefined,
        academicTitle:
          fieldConfig.academicTitle && !rf.has('academicTitle')
            ? values.academicTitle
            : (user?.userProfile?.academicTitle ?? undefined),
      };
      await userService.updateUserInfo(params);
      const data = await userService.getFullUserInfo();
      onUserInfoUpdated(data);
      onEditModeChange(false);
      message.success('保存成功');
    } catch (err) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      message.error(parseErrorMessage(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  };

  const optionsMap = useMemo(
    () =>
      ({
        sex: Object.entries(SEX_LABELS).map(([value, label]) => (
          <Option key={value} value={Number(value)}>
            {label}
          </Option>
        )),
        degreeLevel: Object.entries(DEGREE_LEVEL_LABELS).map(([value, label]) => (
          <Option key={value} value={Number(value)}>
            {label}
          </Option>
        )),
      }) as const,
    []
  );

  if (!show) return null;

  return (
    <div className={styles.profileSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>基本档案</h3>
        {!editMode ? (
          <Button
            type="primary"
            icon={<RiPencilLine size={16} />}
            onClick={() => onEditModeChange(true)}
          >
            编辑资料
          </Button>
        ) : null}
      </div>
      {editMode ? (
        <Form form={form} layout="vertical" className={styles.profileForm}>
          <div className={styles.formFieldsGrid}>
            {visibleFields.map((field) => {
              const lockedByServer = readonlyFieldSet.has(field.key);
              if (lockedByServer) {
                if (field.key === 'sex') {
                  return (
                    <Form.Item key={field.key} name={field.key} label={field.label}>
                      <SexReadonlyInput />
                    </Form.Item>
                  );
                }
                if (field.key === 'degreeLevel') {
                  return (
                    <Form.Item key={field.key} name={field.key} label={field.label}>
                      <DegreeLevelReadonlyInput />
                    </Form.Item>
                  );
                }
                return (
                  <Form.Item key={field.key} name={field.key} label={field.label}>
                    <Input disabled readOnly className={styles.editableInput} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item key={field.key} name={field.key} label={field.label}>
                  {field.type === 'input' ? (
                    <Input placeholder={field.placeholder} className={styles.editableInput} />
                  ) : (
                    <Select
                      placeholder={field.placeholder}
                      allowClear
                      className={styles.editableInput}
                    >
                      {field.optionsKey ? optionsMap[field.optionsKey] : null}
                    </Select>
                  )}
                </Form.Item>
              );
            })}
          </div>
          <div className={styles.formActions}>
            <Form.Item className={styles.submitItem}>
              <Button type="primary" onClick={() => void handleSave()} loading={saving}>
                保存
              </Button>
              <Button onClick={onCancel} className={styles.cancelBtn}>
                取消
              </Button>
            </Form.Item>
          </div>
        </Form>
      ) : (
        <Descriptions column={2} layout="vertical" size="small" className={styles.descriptions}>
          {visibleFields.map((field) => (
            <Descriptions.Item key={field.key} label={field.label}>
              {getProfileDisplayString(user, field.key)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      )}
    </div>
  );
};

export default AccountForm;
