import type { Meta, StoryObj } from '@storybook/react-vite';
import { Mail } from 'lucide-react';
import { useState } from 'react';

import { AppButton } from '@/components/base/Button';

import Checkbox from './Checkbox';
import Fieldset from './Fieldset';
import FormField from './FormField';
import Input from './Input';
import styles from './Input.stories.module.less';
import InputGroup from './InputGroup';
import InputOTP, { REGEXP_ONLY_DIGITS } from './InputOTP';
import PasswordInput from './PasswordInput';
import TextArea from './TextArea';
import UploadZone from './UploadZone';

const DEMO_UPLOAD_FILE = new File(['storybook upload preview'], '需求说明.pdf', {
  type: 'application/pdf',
});

function TextInputStory() {
  const [value, setValue] = useState('WisePen');

  return (
    <Input
      aria-label="工作区名称"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

function CheckboxStory() {
  const [isSelected, setIsSelected] = useState(true);

  return (
    <Checkbox isSelected={isSelected} onChange={setIsSelected}>
      同意接收产品更新通知
    </Checkbox>
  );
}

function FormFieldStory() {
  const [value, setValue] = useState('');

  return (
    <FormField
      label="工作区名称"
      value={value}
      onChange={setValue}
      description="该名称会展示给工作区成员。"
      isRequired
    >
      <Input placeholder="请输入工作区名称" />
    </FormField>
  );
}

function InputGroupStory() {
  const [value, setValue] = useState('hello@wisepen.ai');

  return (
    <FormField label="邮箱" value={value} onChange={setValue}>
      <InputGroup>
        <InputGroup.Prefix>
          <Mail size={18} aria-hidden="true" />
        </InputGroup.Prefix>
        <InputGroup.Input type="email" placeholder="name@example.com" />
      </InputGroup>
    </FormField>
  );
}

function InputOtpStory() {
  const [value, setValue] = useState('1024');

  return (
    <InputOTP
      aria-label="验证码"
      value={value}
      onChange={setValue}
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
    >
      <InputOTP.Group>
        {[0, 1, 2].map((index) => (
          <InputOTP.Slot key={index} index={index} />
        ))}
      </InputOTP.Group>
      <InputOTP.Separator />
      <InputOTP.Group>
        {[3, 4, 5].map((index) => (
          <InputOTP.Slot key={index} index={index} />
        ))}
      </InputOTP.Group>
    </InputOTP>
  );
}

function PasswordInputStory() {
  const [value, setValue] = useState('password');

  return (
    <PasswordInput
      aria-label="密码"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      showPasswordLabel="显示密码"
      hidePasswordLabel="隐藏密码"
    />
  );
}

function TextAreaStory() {
  const [value, setValue] = useState('请描述你希望改进的使用体验。');

  return (
    <FormField label="反馈内容" value={value} onChange={setValue} isRequired>
      <TextArea rows={4} />
    </FormField>
  );
}

function FieldsetStory() {
  const [isEmailEnabled, setIsEmailEnabled] = useState(true);
  const [isDesktopEnabled, setIsDesktopEnabled] = useState(false);

  return (
    <Fieldset>
      <Fieldset.Legend>通知方式</Fieldset.Legend>
      <Fieldset.Group>
        <Checkbox isSelected={isEmailEnabled} onChange={setIsEmailEnabled}>
          邮件通知
        </Checkbox>
        <Checkbox isSelected={isDesktopEnabled} onChange={setIsDesktopEnabled}>
          桌面通知
        </Checkbox>
      </Fieldset.Group>
      <Fieldset.Actions>
        <AppButton variant="secondary">恢复默认</AppButton>
        <AppButton variant="primary">保存设置</AppButton>
      </Fieldset.Actions>
    </Fieldset>
  );
}

function UploadZoneStory() {
  const [file, setFile] = useState<File | null>(DEMO_UPLOAD_FILE);

  return (
    <UploadZone
      file={file}
      accept=".pdf,.doc,.docx"
      label="上传需求文档"
      description="支持 PDF、DOC、DOCX 格式，单个文件不超过 20 MB。"
      getFileProgress={() => 64}
      onFileChange={setFile}
    />
  );
}

const meta = {
  title: 'Input/基础输入',
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  render: () => <TextInputStory />,
};

export const CheckboxControl: Story = {
  render: () => <CheckboxStory />,
};

export const Field: Story = {
  render: () => <FormFieldStory />,
};

export const Group: Story = {
  render: () => <InputGroupStory />,
};

export const OneTimePassword: Story = {
  render: () => <InputOtpStory />,
};

export const Password: Story = {
  render: () => <PasswordInputStory />,
};

export const MultilineText: Story = {
  render: () => <TextAreaStory />,
};

export const GroupedFields: Story = {
  render: () => (
    <div className={styles.narrowStack}>
      <FieldsetStory />
    </div>
  ),
};

export const Upload: Story = {
  render: () => (
    <div className={styles.stack}>
      <UploadZoneStory />
    </div>
  ),
};
