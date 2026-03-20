import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Form, Input, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { LuUpload } from 'react-icons/lu';
import { useGroupService, useImageService } from '@/contexts/ServicesContext';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import { createBeforeUploadImageWithinLimit } from '@/utils/image';
import { useAppMessage } from '@/hooks/useAppMessage';
import type { EditGroupRequest } from '@/services/Group';
import { GROUP_TYPE } from '@/constants/group';
import type { EditGroupInfoModalProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;

/** 编辑小组表单值（含封面上传） */
type EditGroupFormValues = Pick<EditGroupRequest, 'groupName' | 'groupDesc'> & {
  cover?: UploadFile[];
};

const fileFromCoverField = (fileList?: UploadFile[]): File | undefined => {
  const item = fileList?.[0];
  const raw = item?.originFileObj;
  return raw instanceof File ? raw : undefined;
};

const EditGroupInfoModal: React.FC<EditGroupInfoModalProps> = ({
  open,
  onCancel,
  groupId,
  groupName = '',
  description = '',
  cover,
  groupType = GROUP_TYPE.NORMAL,
  onSuccess,
}) => {
  const groupService = useGroupService();
  const imageService = useImageService();
  const message = useAppMessage();
  const beforeUploadCover = useMemo(
    () => createBeforeUploadImageWithinLimit((text) => message.error(text)),
    [message]
  );
  const [form] = Form.useForm<EditGroupFormValues>();
  const [loading, setLoading] = useState(false);

  const normalizeUpload = (e: { fileList?: UploadFile[] } | UploadFile[]) =>
    Array.isArray(e) ? e : (e?.fileList ?? []);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ groupName, groupDesc: description });
    }
  }, [open, form, groupName, description]);

  const handleConfirm = async () => {
    if (!groupId) {
      message.error('小组ID不存在');
      return;
    }
    try {
      const formValues = (await form.validateFields()) as EditGroupFormValues;
      setLoading(true);
      const newFile = fileFromCoverField(formValues.cover);
      let groupCoverUrl = cover ?? '';
      if (newFile) {
        const { publicUrl } = await imageService.uploadImage({
          file: newFile,
          isPublic: true,
          bizPath: `groups/${groupId}`,
        });
        groupCoverUrl = publicUrl;
      }
      const params: EditGroupRequest = {
        groupId,
        groupName: formValues.groupName,
        groupDesc: formValues.groupDesc,
        groupCoverUrl,
        groupType,
      };
      await groupService.editGroup(params);
      message.success('小组信息已更新');
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error: unknown) {
      message.error(parseErrorMessage(error, '编辑小组信息失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="编辑小组信息"
      open={open}
      onCancel={onCancel}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} loading={loading}>
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
        <Form.Item label="小组描述" name="groupDesc">
          <TextArea rows={4} placeholder="请输入小组描述（可选）" />
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

export default EditGroupInfoModal;
