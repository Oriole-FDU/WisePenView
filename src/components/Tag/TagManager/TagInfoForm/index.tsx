import React, { useEffect, useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { TagServices } from '@/services/Tag';
import type { UpdateTagRequest } from '@/services/Tag';
import { parseErrorMessage } from '@/utils/parseErrorMessage';
import type { TagInfoFormProps } from './index.type';
import styles from './style.module.less';

const { TextArea } = Input;

const TagInfoForm: React.FC<TagInfoFormProps> = ({
  tag,
  groupId,
  onSuccess,
}) => {
  const [form] = Form.useForm<Pick<UpdateTagRequest, 'tagName' | 'tagDesc'>>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tag) {
      form.setFieldsValue({
        tagName: tag.tagName ?? '',
        tagDesc: tag.tagDesc ?? '',
      });
    } else {
      form.resetFields();
    }
  }, [tag, form]);

  const handleSubmit = async () => {
    if (!tag?.tagId) return;
    try {
      const values = await form.validateFields();
      setLoading(true);
      const params: UpdateTagRequest = {
        tagId: tag.tagId,
        tagName: values.tagName,
        tagDesc: values.tagDesc,
        ...(groupId ? { groupId } : {}),
      };
      await TagServices.updateTag(params);
      message.success('标签已更新');
      onSuccess?.();
    } catch (err) {
      message.error(parseErrorMessage(err, '更新标签失败'));
    } finally {
      setLoading(false);
    }
  };

  if (!tag) {
    return null;
  }

  return (
    <div className={styles.form}>
      <div className={styles.sectionTitle}>标签信息</div>
      <Form form={form} layout="vertical">
        <Form.Item
          label="标签名称"
          name="tagName"
          rules={[{ required: true, message: '请输入标签名称' }]}
        >
          <Input placeholder="请输入标签名称" />
        </Form.Item>
        <Form.Item label="标签描述" name="tagDesc">
          <TextArea rows={4} placeholder="请输入标签描述（可选）" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default TagInfoForm;
