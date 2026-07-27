import AppIconButton from '@/components/Button/AppIconButton';
import { Input, Select } from '@/components/Input';
import { useUserService } from '@/domains';
import type { UpdateUserInfoRequest } from '@/domains/User';
import { DEGREE, SEX } from '@/domains/User';
import { parseErrorMessage } from '@/utils/error';
import type { ProfileFieldKey } from '@/views/app/profile/profile.config';
import { Button, Form, Label, ListBox, TextField, toast } from '@heroui/react';
import { useRequest } from 'ahooks';
import { Pencil, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { buildProfileFormValues } from './buildProfileFormValues';
import type { AccountFormProps } from './index.type';
import { getProfileDisplayString } from './profileDisplay';
import styles from './style.module.less';

type FormDraft = {
  user: AccountFormProps['user'];
  values: UpdateUserInfoRequest;
};

function getFieldValue(values: UpdateUserInfoRequest, key: ProfileFieldKey) {
  return values[key as keyof UpdateUserInfoRequest];
}

function getFieldInputValue(values: UpdateUserInfoRequest, key: ProfileFieldKey) {
  const value = getFieldValue(values, key);
  return value == null ? '' : String(value);
}

function getReadonlyInputValue(
  values: UpdateUserInfoRequest,
  key: ProfileFieldKey,
  translateEnum: (key: string) => string
) {
  const value = getFieldValue(values, key);
  if (value == null || value === '') return '-';
  if (key === 'sex') {
    const enumKey = SEX.getKey(Number(value));
    return enumKey ? translateEnum(`enum.sex.${enumKey}`) : String(value);
  }
  if (key === 'degreeLevel') {
    const enumKey = DEGREE.getKey(Number(value));
    return enumKey ? translateEnum(`enum.degreeLevel.${enumKey}`) : String(value);
  }
  return String(value);
}

const OPTIONS_MAP = {
  sex: SEX.options,
  degreeLevel: DEGREE.options,
} as const;

function AccountForm({
  show,
  user,
  fieldConfig,
  visibleFields,
  readonlyFieldSet,
  onUserInfoReload,
}: AccountFormProps) {
  const { t } = useTranslation(['profile', 'common']);
  const userService = useUserService();
  const [editMode, setEditMode] = useState(false);
  const [formDraft, setFormDraft] = useState<FormDraft | null>(null);
  const userFormValues = (user ? buildProfileFormValues(user) : {}) satisfies UpdateUserInfoRequest;
  const formValues = editMode && formDraft?.user === user ? formDraft.values : userFormValues;

  const { loading: saving, runAsync: runSave } = useRequest(
    async () => {
      const rf = new Set(user?.readonlyFields ?? []);
      const params: UpdateUserInfoRequest = {
        nickname:
          fieldConfig.nickname && !rf.has('nickname')
            ? formValues.nickname
            : (user?.userInfo?.nickname ?? undefined),
        realName:
          fieldConfig.realName && !rf.has('realName')
            ? formValues.realName
            : (user?.userInfo?.realName ?? undefined),
        sex: fieldConfig.sex && !rf.has('sex') ? formValues.sex : user?.userProfile?.sex,
        university:
          fieldConfig.university && !rf.has('university')
            ? (formValues.university ?? null)
            : (user?.userProfile?.university ?? null),
        college:
          fieldConfig.college && !rf.has('college')
            ? formValues.college
            : (user?.userProfile?.college ?? undefined),
        major:
          fieldConfig.major && !rf.has('major')
            ? formValues.major
            : (user?.userProfile?.major ?? undefined),
        className:
          fieldConfig.className && !rf.has('className')
            ? formValues.className
            : (user?.userProfile?.className ?? undefined),
        enrollmentYear:
          fieldConfig.enrollmentYear && !rf.has('enrollmentYear')
            ? formValues.enrollmentYear
            : (user?.userProfile?.enrollmentYear ?? undefined),
        degreeLevel:
          fieldConfig.degreeLevel && !rf.has('degreeLevel')
            ? formValues.degreeLevel
            : typeof user?.userProfile?.degreeLevel === 'number'
              ? user.userProfile.degreeLevel
              : undefined,
        academicTitle:
          fieldConfig.academicTitle && !rf.has('academicTitle')
            ? formValues.academicTitle
            : (user?.userProfile?.academicTitle ?? undefined),
      };
      await userService.updateUserInfo(params);
      await onUserInfoReload();
    },
    {
      manual: true,
      onSuccess: () => {
        setFormDraft(null);
        setEditMode(false);
        toast.success(t('form.saveSuccess'));
      },
      onError: (err) => {
        if (err && typeof err === 'object' && 'errorFields' in err) return;
        toast.danger(parseErrorMessage(err));
      },
    }
  );

  const updateFormValue = (key: ProfileFieldKey, value: string | number | undefined) => {
    setFormDraft((prev) => ({
      user,
      values: { ...(prev?.user === user ? prev.values : userFormValues), [key]: value },
    }));
  };

  const handleCancel = () => {
    setFormDraft(null);
    setEditMode(false);
  };

  const handleStartEdit = () => {
    setFormDraft({ user, values: userFormValues });
    setEditMode(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runSave();
  };

  if (!show) return null;

  return (
    <div className={styles.profileSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{t('form.sectionTitle')}</h3>
        {!editMode ? (
          <Button variant="primary" onPress={handleStartEdit}>
            <Pencil size={16} aria-hidden="true" />
            {t('form.edit')}
          </Button>
        ) : null}
      </div>
      {editMode ? (
        <Form onSubmit={handleSubmit} className={styles.profileForm}>
          <div className={styles.formFieldsGrid}>
            {visibleFields.map((field) => {
              const lockedByServer = readonlyFieldSet.has(field.key);
              const fieldLabel = t(field.labelKey);
              const fieldPlaceholder = t(field.placeholderKey);
              if (lockedByServer) {
                return (
                  <TextField
                    key={field.key}
                    aria-label={fieldLabel}
                    value={getReadonlyInputValue(formValues, field.key, t)}
                    isDisabled
                    className={styles.formField}
                  >
                    <Label>{fieldLabel}</Label>
                    <Input readOnly className={styles.editableInput} />
                  </TextField>
                );
              }
              return (
                <div key={field.key} className={styles.formField}>
                  {field.type === 'input' ? (
                    <TextField
                      aria-label={fieldLabel}
                      value={getFieldInputValue(formValues, field.key)}
                      onChange={(value) => updateFormValue(field.key, value)}
                    >
                      <Label>{fieldLabel}</Label>
                      <Input placeholder={fieldPlaceholder} className={styles.editableInput} />
                    </TextField>
                  ) : (
                    <Select
                      aria-label={fieldLabel}
                      placeholder={fieldPlaceholder}
                      value={getFieldInputValue(formValues, field.key) || null}
                      onChange={(value) =>
                        updateFormValue(
                          field.key,
                          value == null || Array.isArray(value) ? undefined : Number(value)
                        )
                      }
                      className={styles.editableInput}
                    >
                      <Label>{fieldLabel}</Label>
                      <Select.Trigger>
                        <Select.Value />
                        {getFieldValue(formValues, field.key) != null ? (
                          <AppIconButton
                            icon={<X aria-hidden="true" />}
                            label={t('form.clearField', { field: fieldLabel })}
                            size="sm"
                            className={styles.clearSelectButton}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              updateFormValue(field.key, undefined);
                            }}
                          />
                        ) : null}
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {(field.optionsKey ? OPTIONS_MAP[field.optionsKey] : []).map(
                            ({ value, key }) => (
                              <ListBox.Item
                                key={String(value)}
                                id={String(value)}
                                textValue={t(`enum.${field.optionsKey}.${key}`)}
                              >
                                {t(`enum.${field.optionsKey}.${key}`)}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            )
                          )}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
          <div className={styles.formActions}>
            <Button type="submit" variant="primary" isDisabled={saving}>
              {t('actions.save', { ns: 'common' })}
            </Button>
            <Button onPress={handleCancel} className={styles.cancelBtn}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
          </div>
        </Form>
      ) : (
        <dl className={styles.descriptions}>
          {visibleFields.map((field) => (
            <div key={field.key} className={styles.descriptionItem}>
              <dt>{t(field.labelKey)}</dt>
              <dd>{getProfileDisplayString(user, field.key, t)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default AccountForm;
