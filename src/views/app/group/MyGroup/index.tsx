import IconText from '@/components/Common/IconText';
import GroupCard from '@/components/Group/GroupCard';
import { CreateGroupModal, JoinGroupModal } from '@/components/Group/GroupModals';
import { useGroupService } from '@/domains';
import type { FetchGroupListRequest, Group } from '@/domains/Group';
import { GROUP_ROLE_FILTER_MAP } from '@/domains/Group';
import { Button, Pagination, toast } from '@heroui/react';
import { usePagination } from 'ahooks';
import { Col, Empty, Row, Spin, Tabs } from 'antd';
import { useMemo, useState } from 'react';
import { AiOutlinePlus, AiOutlineUserAdd } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';
import layout from '../style.module.less';
import page from './style.module.less';

const PAGE_SIZE = 8;
const PAGINATION_SIBLING_COUNT = 1;

type PaginationPageItem = number | 'ellipsis';

function buildPaginationItems(currentPage: number, totalPages: number): PaginationPageItem[] {
  const pages = new Set<number>([1, totalPages]);

  for (
    let pageNumber = currentPage - PAGINATION_SIBLING_COUNT;
    pageNumber <= currentPage + PAGINATION_SIBLING_COUNT;
    pageNumber += 1
  ) {
    if (pageNumber > 1 && pageNumber < totalPages) {
      pages.add(pageNumber);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);

  return sortedPages.flatMap((pageNumber, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage && pageNumber - previousPage > 1) {
      return ['ellipsis', pageNumber] as PaginationPageItem[];
    }
    return [pageNumber];
  });
}

function MyGroup() {
  const groupService = useGroupService();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('joined');
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false);

  const groupRoleFilter = GROUP_ROLE_FILTER_MAP[activeTab] ?? GROUP_ROLE_FILTER_MAP.joined;

  const {
    data: groupsData,
    loading,
    refresh: refreshGroups,
    pagination: { current: pageNum, pageSize: size, onChange: onPageChange },
  } = usePagination(
    async ({ current, pageSize }) => {
      const params: FetchGroupListRequest = {
        groupRoleFilter: groupRoleFilter,
        page: current,
        size: pageSize,
      };
      const { groups, total } = await groupService.fetchGroupList(params);
      return { list: groups, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: PAGE_SIZE,
      refreshDeps: [groupRoleFilter],
      onError: () => {
        toast.danger('获取小组列表失败');
      },
    }
  );
  const groups: Group[] = groupsData?.list ?? [];
  const total = groupsData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / size), 1);
  const pages = useMemo(() => buildPaginationItems(pageNum, totalPages), [pageNum, totalPages]);
  const start = total === 0 ? 0 : (pageNum - 1) * size + 1;
  const end = Math.min(pageNum * size, total);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (pageNum !== 1) {
      onPageChange(1, size);
    }
  };

  const handleModalSuccess = () => {
    setJoinGroupModalOpen(false);
    setCreateGroupModalOpen(false);
    void refreshGroups();
  };

  const handleGroupClick = (group: Group) => {
    if (group.groupId) {
      navigate(`/app/my-group/${group.groupId}`);
    }
  };

  return (
    <div className={layout.pageContainer}>
      <div className={layout.pageHeaderWithActions}>
        <div>
          <h1 className={layout.pageTitle}>我的小组</h1>
          <span className={layout.pageSubtitle}>管理您的小组和协作</span>
        </div>
        <div className={layout.actionsRow}>
          <Button onPress={() => setJoinGroupModalOpen(true)}>
            <IconText icon={<AiOutlineUserAdd />} iconSize={16}>
              加入小组
            </IconText>
          </Button>
          <Button variant="primary" onPress={() => setCreateGroupModalOpen(true)}>
            <IconText icon={<AiOutlinePlus />} iconSize={16}>
              新建小组
            </IconText>
          </Button>
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          { key: 'joined', label: '我加入的' },
          { key: 'managed', label: '我管理的' },
        ]}
        className={layout.detailTabs}
      />

      <Spin spinning={loading}>
        {groups.length === 0 ? (
          <div className={page.emptyState}>
            <Empty description="暂无小组" />
          </div>
        ) : (
          <Row gutter={[24, 24]}>
            {groups.map((group) => (
              <Col key={group.groupId} xs={24} sm={12} md={8} lg={6}>
                <GroupCard group={group} onClick={handleGroupClick} />
              </Col>
            ))}
          </Row>
        )}

        {total > 0 && (
          <div className={page.paginationWrap}>
            <Pagination size="sm">
              <Pagination.Summary>
                {start} - {end} / 共 {total} 条
              </Pagination.Summary>
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.Previous
                    isDisabled={pageNum <= 1}
                    onPress={() => onPageChange(Math.max(1, pageNum - 1), size)}
                  >
                    <Pagination.PreviousIcon />
                    上一页
                  </Pagination.Previous>
                </Pagination.Item>
                {pages.map((targetPage, index) =>
                  targetPage === 'ellipsis' ? (
                    <Pagination.Item key={`ellipsis-${index}`}>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  ) : (
                    <Pagination.Item key={targetPage}>
                      <Pagination.Link
                        isActive={targetPage === pageNum}
                        onPress={() => onPageChange(targetPage, size)}
                      >
                        {targetPage}
                      </Pagination.Link>
                    </Pagination.Item>
                  )
                )}
                <Pagination.Item>
                  <Pagination.Next
                    isDisabled={pageNum >= totalPages}
                    onPress={() => onPageChange(Math.min(totalPages, pageNum + 1), size)}
                  >
                    下一页
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            </Pagination>
          </div>
        )}
      </Spin>

      <JoinGroupModal
        isOpen={joinGroupModalOpen}
        onOpenChange={setJoinGroupModalOpen}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onOpenChange={setCreateGroupModalOpen}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}

export default MyGroup;
