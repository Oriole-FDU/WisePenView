import { ChevronRight, Loader } from 'lucide-react';
import { useState } from 'react';
import styles from './ThinkingBlock.module.less';

interface ThinkingBlockProps {
  content: string;
  duration?: number;
  loading?: boolean;
}

function ThinkingBlock({ content, duration, loading }: ThinkingBlockProps) {
  const [manuallyCollapsed, setManuallyCollapsed] = useState(!loading);
  const open = loading || !manuallyCollapsed;

  // 如果没有任何内容且不在加载中，则不渲染
  if (!content && !loading) return null;

  // 标题栏内容动态生成
  const labelContent = (
    <div className={styles.headerLabel}>
      {loading ? (
        <>
          <Loader className={styles.spinIcon} />
          <span>深度思考中...</span>
        </>
      ) : (
        // 完成状态：显示静态标题
        <span>思考过程</span>
      )}

      {/* 只有在生成结束后，才显示耗时 */}
      {!loading && duration !== undefined && (
        <span className={styles.durationTag}>{duration}s</span>
      )}
    </div>
  );

  return (
    <div className={styles.thinkingWrapper}>
      <button
        type="button"
        className={styles.collapseHeader}
        aria-expanded={open}
        onClick={() => setManuallyCollapsed((collapsed) => !collapsed)}
      >
        {labelContent}
        <span className={styles.expandIcon}>
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div className={styles.collapseContentBox}>
          <blockquote className={styles.content}>{content}</blockquote>
        </div>
      ) : null}
    </div>
  );
}

export default ThinkingBlock;
