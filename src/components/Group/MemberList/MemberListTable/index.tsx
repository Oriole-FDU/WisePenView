import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table } from 'antd';
import type { TableProps, TablePaginationConfig } from 'antd';
import type { GroupMember } from '@/types/group';
import type { MemberListPaginationConfig, MemberListTableProps } from './index.type';
import { getColumns } from './TableConfig';
import styles from './style.module.less';
import { useGroupService } from '@/contexts/ServicesContext';
import { useAppMessage } from '@/hooks/useAppMessage';

type TableRowSelection<T extends object = object> = TableProps<T>['rowSelection'];

const MemberListTable: React.FC<MemberListTableProps> = ({
  groupId,
  permissionConfig,
  pagination,
  isEditMode,
  selectedRowKeys,
  onSelectedRowKeysChange,
  onSelectedMembersChange,
  onTotalChange,
  refreshTrigger,
}) => {
  const groupService = useGroupService();
  const message = useAppMessage();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(pagination?.defaultPageSize ?? 5);
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [total, setTotal] = useState(0);

  const selectedMembersMapRef = useRef<Map<string, GroupMember>>(new Map());

  const fetchMembers = async (page: number, size: number) => {
    try {
      setLoading(true);
      const { members: newMembers, total: newTotal } = await groupService.fetchGroupMembers(
        groupId,
        page,
        size
      );
      setMembers(newMembers);
      setTotal(newTotal);
      onTotalChange?.(newTotal);
    } catch {
      message.error('获取成员列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    setCurrentPage(1);
    fetchMembers(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) {
      fetchMembers(currentPage, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const paginationConfig: Required<MemberListPaginationConfig> = {
    defaultPageSize: pagination?.defaultPageSize ?? 5,
    pageSizeOptions: pagination?.pageSizeOptions ?? [5, 10, 20, 50],
    showSizeChanger: pagination?.showSizeChanger ?? true,
  };

  const dataSource = useMemo(
    () =>
      members.map((member) => ({
        ...member,
        key: member.userId,
      })),
    [members]
  );

  useEffect(() => {
    members.forEach((member) => {
      const key = String(member.userId);
      if (selectedRowKeys.some((k) => String(k) === key)) {
        selectedMembersMapRef.current.set(key, member);
      }
    });

    if (onSelectedMembersChange) {
      const selectedMembers = selectedRowKeys
        .map((k) => selectedMembersMapRef.current.get(String(k)))
        .filter((member): member is GroupMember => member !== undefined);
      onSelectedMembersChange(selectedMembers);
    }
  }, [members, selectedRowKeys, onSelectedMembersChange]);

  const columns = useMemo(() => getColumns(permissionConfig, styles), [permissionConfig]);

  const rowSelection: TableRowSelection<GroupMember & { key: React.Key }> = useMemo(() => {
    if (!isEditMode) return undefined;

    const currentPageKeysSet = new Set(dataSource.map((item) => String(item.key)));

    return {
      selectedRowKeys: selectedRowKeys.filter((key) => currentPageKeysSet.has(String(key))),
      onChange: (newSelectedRowKeys: React.Key[]) => {
        const validNewKeys: (string | number)[] = newSelectedRowKeys.filter(
          (key): key is string | number => typeof key === 'string' || typeof key === 'number'
        );

        const otherPageKeys = selectedRowKeys.filter((key) => !currentPageKeysSet.has(String(key)));
        const finalSelectedKeys = [...otherPageKeys, ...validNewKeys];
        onSelectedRowKeysChange(finalSelectedKeys);

        validNewKeys.forEach((key) => {
          const idKey = String(key);
          const member = members.find((m) => String(m.userId) === idKey);
          if (member) selectedMembersMapRef.current.set(idKey, member);
        });

        const validNewKeysSet = new Set(validNewKeys.map((k) => String(k)));
        const previousCurrentPageKeys = selectedRowKeys.filter((key) =>
          currentPageKeysSet.has(String(key))
        );
        previousCurrentPageKeys.forEach((key) => {
          if (!validNewKeysSet.has(String(key))) {
            selectedMembersMapRef.current.delete(String(key));
          }
        });
      },
    };
  }, [isEditMode, selectedRowKeys, dataSource, members, onSelectedRowKeysChange]);

  const handleTableChange = async (
    pagination: TablePaginationConfig,
    _filters: unknown,
    _sorter: unknown
  ) => {
    let newPage = currentPage;
    let newPageSize = pageSize;
    let pageChanged = false;

    if (pagination.current !== undefined && pagination.current !== currentPage) {
      newPage = pagination.current;
      setCurrentPage(newPage);
      pageChanged = true;
    }

    if (pagination.pageSize !== undefined && pagination.pageSize !== pageSize) {
      newPageSize = pagination.pageSize;
      setPageSize(newPageSize);
      if (pagination.current === undefined) {
        newPage = 1;
        setCurrentPage(1);
      }
      pageChanged = true;
    }

    if (pageChanged) {
      await fetchMembers(newPage, newPageSize);
    }
  };

  return (
    <Table<GroupMember & { key: React.Key }>
      rowSelection={rowSelection}
      columns={columns}
      dataSource={dataSource}
      className={styles.tableWrapper}
      onChange={handleTableChange}
      loading={loading}
      pagination={{
        size: 'small',
        current: currentPage,
        pageSize,
        total,
        pageSizeOptions: paginationConfig.pageSizeOptions,
        showSizeChanger: paginationConfig.showSizeChanger,
        showTotal: (total) => `共 ${total} 人`,
      }}
    />
  );
};

export default MemberListTable;
