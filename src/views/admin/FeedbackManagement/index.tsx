import { DataTable, type DataTableColumn } from '@/components/Table';
import { FEEDBACK_TYPE } from '@/domains/User';
import { formatTimestampToDateTime } from '@/utils/format/formatTime';
import AdminPageHeader from '@/views/admin/_common/AdminPageHeader';
import { ADMIN_PAGE_CONFIGS } from '@/views/admin/pages';
import { Button, Chip, ListBox, Select, toast } from '@heroui/react';
import { useState } from 'react';
import styles from '../style.module.less';
import FeedbackDetailDialog from './FeedbackDetailDialog';
import {
  FEEDBACK_STATUS_LABEL,
  type FeedbackListItem,
  type FeedbackStatus,
} from './FeedbackDetailDialog/index.type';
import FeedbackStatusSelect from './FeedbackStatusSelect';
import pageStyles from './style.module.less';

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const EMPTY_TEXT = '-';

const formatOptionalText = (value?: string | number | null): string => {
  if (value == null) return EMPTY_TEXT;
  const text = String(value).trim();
  return text ? text : EMPTY_TEXT;
};

const formatDateTime = (value?: string | null): string => {
  const formatted = formatTimestampToDateTime(value);
  return formatted || EMPTY_TEXT;
};

const formatFeedbackTypes = (types: FeedbackListItem['types']): string => {
  if (!types.length) return EMPTY_TEXT;
  return types.map((type) => FEEDBACK_TYPE.getLabel(type)).join('、');
};

/** 前端示例数据，仅用于页面预览，不依赖后端 */
const INITIAL_FEEDBACKS: FeedbackListItem[] = [
  {
    feedbackId: 'example-1',
    userId: '10001',
    username: 'demo_user_a',
    content: '导出笔记时偶尔失败，希望错误提示能更明确一些。',
    contact: 'demo_a@example.com',
    imageUrl: '',
    types: [FEEDBACK_TYPE.BUG_REPORT],
    status: 'PENDING',
    createTime: '2026-07-20T10:30:00.000Z',
  },
  {
    feedbackId: 'example-2',
    userId: '10002',
    username: 'demo_user_b',
    content: '希望管理端支持按反馈类型筛选，方便快速处理；另外咨询一下权限入口在哪里。',
    contact: 'demo_b@example.com',
    types: [FEEDBACK_TYPE.SUGGESTION, FEEDBACK_TYPE.CONSULTATION, FEEDBACK_TYPE.BUG_REPORT],
    status: 'PROCESSING',
    createTime: '2026-07-21T14:15:00.000Z',
  },
];

function FeedbackManagement() {
  const page = ADMIN_PAGE_CONFIGS.feedback;
  const [feedbackList, setFeedbackList] = useState<FeedbackListItem[]>(INITIAL_FEEDBACKS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const total = feedbackList.length;
  const feedbacks = feedbackList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleStatusChange = (feedbackId: string, status: FeedbackStatus) => {
    setFeedbackList((prev) =>
      prev.map((item) => (item.feedbackId === feedbackId ? { ...item, status } : item))
    );
    setSelectedFeedback((prev) =>
      prev && prev.feedbackId === feedbackId ? { ...prev, status } : prev
    );
    toast.success(`已更新为「${FEEDBACK_STATUS_LABEL[status]}」`);
  };

  const columns: DataTableColumn<FeedbackListItem>[] = [
    {
      id: 'username',
      label: '用户',
      width: 'lg',
      isRowHeader: true,
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell emphasis title={formatOptionalText(record.username || record.userId)}>
          {formatOptionalText(record.username || record.userId)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'types',
      label: '类型',
      width: 'lg',
      align: 'start',
      renderCell: (record) => {
        const typeText = formatFeedbackTypes(record.types);
        return (
          <Chip size="sm" variant="soft">
            <Chip.Label>{typeText}</Chip.Label>
          </Chip>
        );
      },
    },
    {
      id: 'status',
      label: '状态',
      width: 'md',
      renderCell: (record) => (
        <FeedbackStatusSelect
          status={record.status}
          ariaLabel={`更新 ${formatOptionalText(record.username || record.userId)} 的处理状态`}
          onChange={(status) => handleStatusChange(record.feedbackId, status)}
        />
      ),
    },
    {
      id: 'content',
      label: '内容',
      width: 'fill',
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell title={formatOptionalText(record.content)}>
          {formatOptionalText(record.content)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'contact',
      label: '联系方式',
      width: 'lg',
      align: 'start',
      renderCell: (record) => (
        <DataTable.TextCell muted title={formatOptionalText(record.contact)}>
          {formatOptionalText(record.contact)}
        </DataTable.TextCell>
      ),
    },
    {
      id: 'createTime',
      label: '提交时间',
      width: 'lg',
      renderCell: (record) => (
        <DataTable.TextCell>{formatDateTime(record.createTime)}</DataTable.TextCell>
      ),
    },
  ];

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setCurrentPage(nextPage);
    setPageSize(nextPageSize);
  };

  const handleRowPress = (record: FeedbackListItem) => {
    setSelectedFeedback(record);
    setDetailOpen(true);
  };

  const handleDetailOpenChange = (open: boolean) => {
    setDetailOpen(open);
    if (!open) {
      setSelectedFeedback(null);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <AdminPageHeader title={page.title} subtitle={page.subtitle} />
      <DataTable<FeedbackListItem>
        ariaLabel="用户反馈列表"
        rowKey="feedbackId"
        items={feedbacks}
        columns={columns}
        title="反馈"
        emptyText="暂无用户反馈"
        className={pageStyles.feedbackTable}
        maxBodyHeight={560}
        onRowPress={handleRowPress}
        toolbar={
          <div className={pageStyles.toolbarActions}>
            <Button variant="secondary" size="sm" isDisabled>
              刷新
            </Button>
          </div>
        }
        pagination={{
          total,
          current: currentPage,
          pageSize,
          summary: `共 ${total} 条`,
          onChange: handlePageChange,
          pageSizeControl: (
            <Select
              aria-label="每页数量"
              value={String(pageSize)}
              onChange={(key) => {
                if (key == null || Array.isArray(key)) return;
                handlePageChange(1, Number(key));
              }}
              className={pageStyles.pageSizeSelect}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <ListBox.Item key={String(size)} id={String(size)} textValue={`${size} 条/页`}>
                      {size} 条/页
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          ),
        }}
      />
      <FeedbackDetailDialog
        isOpen={detailOpen}
        onOpenChange={handleDetailOpenChange}
        feedback={selectedFeedback}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default FeedbackManagement;
