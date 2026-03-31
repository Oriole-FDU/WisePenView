import React, { useMemo, useState } from 'react';
import { Modal, Button, Form, Input, Radio, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useRequest } from 'ahooks';
import { LuUpload } from 'react-icons/lu';
import { useGroupService, useImageService, useUserService } from '@/contexts/ServicesContext';
import type { CreateGroupRequest } from '@/services/Group';
import type { GroupFileOrgLogic } from '@/types/group';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { createBeforeUploadImageWithinLimit } from '@/utils/image';
import { useAppMessage } from '@/hooks/useAppMessage';
import { GROUP_TYPE, GROUP_TYPE_LABELS, ALLOWED_GROUP_TYPES_MAP } from '@/constants/group';
import type { CreateGroupModalProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;
const { Option } = Select;

type CreateGroupFormValues = Omit<CreateGroupRequest, 'groupCoverUrl'> & {
  cover?: UploadFile[];
  fileOrgLogic: GroupFileOrgLogic;
};

const fileFromCoverField = (fileList?: UploadFile[]): File | undefined => {
  const item = fileList?.[0];
  const raw = item?.originFileObj;
  return raw instanceof File ? raw : undefined;
};

const groupTypeOptionsBase = Object.entries(GROUP_TYPE_LABELS).map(([value, label]) => ({
  value: Number(value),
  label,
}));

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ open, onCancel, onSuccess }) => {
  const groupService = useGroupService();
  const imageService = useImageService();
  const userService = useUserService();
  const message = useAppMessage();
  const beforeUploadCover = useMemo(
    () => createBeforeUploadImageWithinLimit((text) => message.error(text)),
    [message]
  );
  const [form] = Form.useForm<CreateGroupFormValues>();
  const [identityType, setIdentityType] = useState<number | undefined>();

  useRequest(() => userService.getUserInfo(), {
    onSuccess: (u) => {
      setIdentityType(u.identityType);
    },
  });

  const allowedGroupTypes = ALLOWED_GROUP_TYPES_MAP[identityType ?? 3];
  const groupTypeOptions = groupTypeOptionsBase.filter((opt) =>
    allowedGroupTypes.includes(opt.value)
  );

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const normalizeUpload = (e: { fileList?: UploadFile[] } | UploadFile[]) =>
    Array.isArray(e) ? e : (e?.fileList ?? []);

  const { loading: submitting, run: runCreateGroup } = useRequest(
    async (values: CreateGroupFormValues) => {
      const coverFile = fileFromCoverField(values.cover);
      let groupCoverUrl = '';
      if (coverFile) {
        const { publicUrl } = await imageService.uploadImage({
          file: coverFile,
          isPublic: true,
          bizPath: 'groups',
        });
        groupCoverUrl = publicUrl;
      }
      const groupId = await groupService.createGroup({
        groupName: values.groupName,
        groupType: values.groupType,
        groupDesc: values.groupDesc,
        groupCoverUrl,
      });
      try {
        await groupService.updateGroupResConfig({
          groupId,
          fileOrgLogic: values.fileOrgLogic,
        });
        message.success('创建成功');
      } catch (configErr: unknown) {
        message.warning(
          parseErrorMessage(configErr, '小组已创建，但文件管理方式未保存，请稍后在小组内重试')
        );
      }
    },
    {
      manual: true,
      onSuccess: () => {
        form.resetFields();
        onCancel();
        onSuccess?.();
      },
      onError: (err: unknown) => {
        const isValidationError =
          err != null &&
          typeof err === 'object' &&
          'errorFields' in err &&
          Array.isArray((err as { errorFields?: unknown }).errorFields);
        if (!isValidationError) {
          message.error(parseErrorMessage(err, '创建失败'));
        }
      },
    }
  );

  const handleConfirm = async () => {
    const values = await form.validateFields();
    runCreateGroup(values);
  };

  return (
    <Modal
      title="新建小组"
      open={open}
      onCancel={handleCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} loading={submitting}>
          确定
        </Button>,
      ]}
      width={500}
    >
      <Form form={form} layout="vertical" className={styles.modalFormPadding}>
        <Form.Item
          label="小组名称"
          name="groupName"
          rules={[{ required: true, message: '请输入小组名称' }]}
        >
          <Input placeholder="请输入小组名称" />
        </Form.Item>
        <Form.Item
          label="小组描述"
          name="groupDesc"
          rules={[{ required: true, message: '请输入小组描述' }]}
        >
          <TextArea rows={4} placeholder="请输入小组描述（可选）" />
        </Form.Item>
        <Form.Item
          label="小组类型"
          name="groupType"
          initialValue={GROUP_TYPE.NORMAL}
          rules={[{ required: true, message: '请选择小组类型' }]}
        >
          <Select>
            {groupTypeOptions.map((opt) => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item
          label="文件管理方式"
          name="fileOrgLogic"
          initialValue={'FOLDER' satisfies GroupFileOrgLogic}
          rules={[{ required: true, message: '请选择文件管理方式（创建后无法更改）' }]}
        >
          <Radio.Group>
            <Radio value="FOLDER">文件夹管理（推荐）</Radio>
            <Radio value="TAG">按标签管理（Beta）</Radio>
          </Radio.Group>
        </Form.Item>
        <Form.Item
          label="封面图片"
          name="cover"
          valuePropName="fileList"
          getValueFromEvent={normalizeUpload}
        >
          <Upload name="file" beforeUpload={beforeUploadCover} accept="image/*" maxCount={1}>
            <Button icon={<LuUpload />}>点击上传</Button>
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default CreateGroupModal;
