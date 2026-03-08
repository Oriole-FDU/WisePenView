import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, Button, Row, Col, Pagination, Empty, Spin, message } from 'antd';
import { AiOutlinePlus, AiOutlineUserAdd } from 'react-icons/ai';
import GroupCard from '@/components/Group/GroupCard';
import { GroupServices, type FetchGroupListRequest } from '@/services/Group';
import type { Group } from '@/types/group';
import { RELATION_TYPE_MAP } from '@/constants/group';
import { JoinGroupModal, CreateGroupModal } from '@/components/Group/GroupModals';
import styles from './style.module.less';

const MyGroup: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('joined');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const relationType = RELATION_TYPE_MAP[activeTab] ?? RELATION_TYPE_MAP.joined;

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params: FetchGroupListRequest = {
        relationType,
        page,
        pageSize,
      };
      const { groups: list, total: totalCount } = await GroupServices.fetchGroupList(params);
      setGroups(list);
      setTotal(totalCount);
    } catch (error) {
      console.log(error);
      message.error('获取小组列表失败');
      setGroups([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [relationType, page, pageSize]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setPage(1);
  };

  const handlePageChange = (newPage: number, newPageSize?: number) => {
    setPage(newPage);
    if (newPageSize && newPageSize !== pageSize) {
      setPageSize(newPageSize);
      setPage(1);
    }
  };

  const handleModalSuccess = () => {
    setJoinGroupModalOpen(false);
    setCreateGroupModalOpen(false);
    fetchGroups();
  };

  const handleGroupClick = (group: Group) => {
    if (group.id) {
      navigate(`/app/my-group/${group.id}`);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeaderWithActions}>
        <div>
          <h1 className={styles.pageTitle}>我的小组</h1>
          <span className={styles.pageSubtitle}>管理您的小组和协作</span>
        </div>
        <div className={styles.actionsRow}>
          <Button icon={<AiOutlineUserAdd size={16} />} onClick={() => setJoinGroupModalOpen(true)}>
            加入小组
          </Button>
          <Button
            type="primary"
            icon={<AiOutlinePlus size={16} />}
            onClick={() => setCreateGroupModalOpen(true)}
          >
            新建小组
          </Button>
        </div>
      </div>

      <div className={styles.tabsWithSearch}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'joined', label: '我加入的' },
            { key: 'managed', label: '我管理的' },
          ]}
          style={{ marginBottom: -1 }}
        />
      </div>

      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Empty description="暂无小组" />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {groups.map((group) => (
              <Col key={group.id} xs={24} sm={12} md={8} lg={6}>
                <GroupCard group={group} onClick={handleGroupClick} />
              </Col>
            ))}
          </Row>
        )}

        {total > 0 && (
          <div className={styles.paginationWrap}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              showTotal={(t) => `共 ${t} 条`}
              pageSizeOptions={['8', '16', '32', '64']}
              onChange={handlePageChange}
            />
          </div>
        )}
      </Spin>

      <JoinGroupModal
        open={joinGroupModalOpen}
        onCancel={() => setJoinGroupModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        open={createGroupModalOpen}
        onCancel={() => setCreateGroupModalOpen(false)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default MyGroup;
