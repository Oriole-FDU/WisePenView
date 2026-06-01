import QuotaBar from '@/components/Common/QuotaBar';
import { useQuotaService } from '@/domains';
import { parseErrorMessage } from '@/utils/error';
import { Pagination, Table, toast, type SortDescriptor } from '@heroui/react';
import { usePagination } from 'ahooks';
import React, { useMemo } from 'react';
import type { QuotaByGroupProps, UserGroupQuota } from './index.type';
import styles from './style.module.less';

type QuotaRecord = UserGroupQuota & { key: string | number };

const DEFAULT_PAGE_SIZE = 10;
const SORTABLE_COLUMNS = new Set(['groupName', 'quotaUsed']);

function buildPages(totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

function QuotaByGroup({ pagination }: QuotaByGroupProps) {
  const quotaService = useQuotaService();
  const {
    data: quotaData,
    loading,
    pagination: {
      current: currentPage = 1,
      pageSize = pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      onChange,
    },
  } = usePagination(
    async ({ current, pageSize: nextPageSize }) => {
      const { quotas, total } = await quotaService.fetchUserGroupQuotas(current, nextPageSize);
      return { list: quotas, total };
    },
    {
      defaultCurrent: 1,
      defaultPageSize: pagination?.defaultPageSize ?? DEFAULT_PAGE_SIZE,
      onError: (error: unknown) => {
        toast.danger(parseErrorMessage(error));
      },
    }
  );

  const quotas: UserGroupQuota[] = useMemo(() => quotaData?.list ?? [], [quotaData?.list]);
  const total = quotaData?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  const pages = useMemo(() => buildPages(totalPages), [totalPages]);

  const dataSource = useMemo(
    () => quotas.map((quota) => ({ ...quota, key: quota.groupId })),
    [quotas]
  );

  const [sortDescriptor, setSortDescriptor] = React.useState<SortDescriptor>({
    column: 'groupName',
    direction: 'ascending',
  });

  const sortedDataSource = useMemo(() => {
    if (!SORTABLE_COLUMNS.has(String(sortDescriptor.column))) {
      return dataSource;
    }

    return [...dataSource].sort((a, b) => {
      const direction = sortDescriptor.direction === 'descending' ? -1 : 1;
      if (sortDescriptor.column === 'quotaUsed') {
        return (a.quotaUsed - b.quotaUsed) * direction;
      }

      return (a.groupName || '').localeCompare(b.groupName || '', 'zh-CN') * direction;
    });
  }, [dataSource, sortDescriptor]);

  return (
    <div>
      <h3 className={styles.title}>我的组配额</h3>
      <Table>
        <Table.ScrollContainer>
          <Table.Content
            aria-label="我的组配额"
            className={styles.tableContent}
            sortDescriptor={sortDescriptor}
            onSortChange={setSortDescriptor}
          >
            <Table.Header>
              <Table.Column allowsSorting isRowHeader id="groupName">
                小组
              </Table.Column>
              <Table.Column allowsSorting id="quotaUsed">
                配额使用
              </Table.Column>
            </Table.Header>
            <Table.Body
              renderEmptyState={() => (
                <div className={styles.emptyText}>{loading ? '加载中...' : '暂无组配额'}</div>
              )}
            >
              {sortedDataSource.map((record: QuotaRecord) => (
                <Table.Row key={record.key} id={record.key} textValue={record.groupName}>
                  <Table.Cell className={styles.groupNameItem}>{record.groupName}</Table.Cell>
                  <Table.Cell>
                    <div className={styles.quotaItem}>
                      <QuotaBar used={record.quotaUsed} limit={record.quotaLimit} />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        <Table.Footer className={styles.tableFooter}>
          <Pagination size="sm" className={styles.pagination}>
            <Pagination.Summary>
              {total > 0 ? `${start} to ${end} of ${total} groups` : '0 groups'}
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={currentPage <= 1}
                  onPress={() => onChange(Math.max(1, currentPage - 1), pageSize)}
                >
                  <Pagination.PreviousIcon />
                  Prev
                </Pagination.Previous>
              </Pagination.Item>
              {pages.map((page) => (
                <Pagination.Item key={page}>
                  <Pagination.Link
                    isActive={page === currentPage}
                    onPress={() => onChange(page, pageSize)}
                  >
                    {page}
                  </Pagination.Link>
                </Pagination.Item>
              ))}
              <Pagination.Item>
                <Pagination.Next
                  isDisabled={currentPage >= totalPages}
                  onPress={() => onChange(Math.min(totalPages, currentPage + 1), pageSize)}
                >
                  Next
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </Table.Footer>
      </Table>
    </div>
  );
}

export default QuotaByGroup;
