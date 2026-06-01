import type { GetUserInfoResponse, UpdateUserInfoRequest } from '@/domains/User';
import type { ProfileFieldConfig, ProfileFieldKey } from '@/views/app/profile/profile.config';

export type ProfileFormValues = UpdateUserInfoRequest;

/** 与 `PROFILE_FIELDS` 单项结构一致 */
export type ProfileFieldItem = {
  key: ProfileFieldKey;
  label: string;
  type: 'input' | 'select';
  placeholder: string;
  optionsKey?: 'sex' | 'degreeLevel';
};

export interface AccountFormProps {
  show: boolean;
  user: GetUserInfoResponse | null;
  fieldConfig: ProfileFieldConfig;
  visibleFields: readonly ProfileFieldItem[];
  readonlyFieldSet: ReadonlySet<ProfileFieldKey>;
  editMode: boolean;
  onEditModeChange: (edit: boolean) => void;
  onUserInfoUpdated: (data: GetUserInfoResponse) => void;
  onCancel: () => void;
}
