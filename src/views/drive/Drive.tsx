import React, { useState } from 'react';
import { Tabs, Input, Button, Table, Avatar, Modal, Alert } from 'antd';
import { TagManager } from '@/components/Tag';
import { AiOutlineTag, AiOutlineCloudUpload, AiOutlineSearch, AiOutlineFileText } from 'react-icons/ai';
import styles from './style.module.less';

const Drive: React.FC = () => {
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // 模拟数据
  const dataSource = [
    { key: '1', name: '未命名文档', owner: 'user_1008', date: '大约 5 小时前' },
    { key: '2', name: '英语作文1', owner: 'user_1008', date: '2 天前' },
    { key: '3', name: '英语作文2', owner: 'Admin', date: '1 周前' },
  ];

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 500 }}>
          <AiOutlineFileText size={18} color="#666" />
          {text}
        </div>
      ),
    },
    {
      title: '所有者',
      dataIndex: 'owner',
      key: 'owner',
      render: (text: string) => (
         <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar size={20} style={{ backgroundColor: '#f56a00', fontSize: 12 }}>U</Avatar>
            <span>{text}</span>
         </div>
      )
    },
    {
      title: '最近更新',
      dataIndex: 'date',
      key: 'date',
      width: 200,
      render: (text: string) => <span style={{ color: '#999' }}>{text}</span>,
    },
  ];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>文档与云盘</h1>
          <span className={styles.pageSubtitle}>管理您的项目和文档</span>
        </div>
        <div className={styles.actionsRow}>
          <Button icon={<AiOutlineTag size={16} />} onClick={() => setTagModalOpen(true)}>
            管理标签
          </Button>
          <Button type="primary" icon={<AiOutlineCloudUpload size={16} />}>上传文件</Button>
        </div>
      </div>

      <div className={styles.tabsWithSearch}>
        <Tabs items={[{ key: '1', label: '文档' }, { key: '2', label: '图片' }]} style={{ marginBottom: -1 }} />
        <Input
          prefix={<AiOutlineSearch size={14} color="#ccc" />}
          placeholder="搜索项目或文档..."
          className={styles.searchInput}
        />
      </div>

      <Table
        dataSource={dataSource}
        columns={columns}
        pagination={false}
        rowSelection={{}}
      />

      <div style={{ textAlign: 'center', marginTop: 32, color: '#ccc' }}>没有更多了</div>

      <Modal
        title="管理标签"
        open={tagModalOpen}
        onCancel={() => setTagModalOpen(false)}
        footer={null}
        width={900}
        styles={{
          body: {
            height: 600,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }}
      >
        <TagManager />
      </Modal>
    </div>
  );
};

export default Drive;
