import { Spin } from '@/components/Feedback';
import {
  Marker,
  MarkerContent,
  MarkerIcon,
  MessageScrollerItem,
  useMessageScrollerScrollable,
} from '@/components/_shadcn';
import markerStyles from '@/components/_shadcn/marker.module.less';
import { useLatest } from 'ahooks';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './style.module.less';

interface HistoryLoaderProps {
  canLoadMoreHistory: boolean;
  loadingMoreHistory: boolean;
  onLoadMoreHistory: () => Promise<void>;
}

function HistoryLoader({
  canLoadMoreHistory,
  loadingMoreHistory,
  onLoadMoreHistory,
}: HistoryLoaderProps) {
  const { t } = useTranslation('chat');
  const { start } = useMessageScrollerScrollable();
  const loadMoreRef = useLatest(onLoadMoreHistory);
  const pendingRef = useRef(false);

  /**
   * @wisepen-manual-effect
   * 执行时机：滚动器到达历史起点且仍有更早消息可加载时发起分页请求。
   * 不可替代原因：滚动器位置和异步请求状态来自 React 外部系统，不能在渲染期触发请求。
   * cleanup：请求本身由历史服务管理；pendingRef 阻止同一组件实例内的重复请求。
   */
  useEffect(() => {
    if (start || !canLoadMoreHistory || loadingMoreHistory || pendingRef.current) return;

    pendingRef.current = true;
    void loadMoreRef.current().finally(() => {
      pendingRef.current = false;
    });
  }, [canLoadMoreHistory, loadMoreRef, loadingMoreHistory, start]);

  if (!loadingMoreHistory) return null;

  return (
    <MessageScrollerItem className={styles.loadMoreWrapper}>
      <Marker variant="separator" role="status">
        <MarkerIcon>
          <Spin size="small" />
        </MarkerIcon>
        <MarkerContent className={markerStyles.shimmer}>
          {t('message.historyLoading')}
        </MarkerContent>
      </Marker>
    </MessageScrollerItem>
  );
}

export default HistoryLoader;
