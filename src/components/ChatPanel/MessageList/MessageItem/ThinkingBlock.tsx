import React from 'react';
import { Collapse, Typography, Tag } from 'antd';
const { Paragraph } = Typography;
import { LuChevronRight, LuLoader } from 'react-icons/lu';
import styles from './ThinkingBlock.module.less';

interface ThinkingBlockProps {
  content: string;
  duration?: number;
  loading?: boolean;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, duration, loading }) => {
  // 如果没有任何内容且不在加载中，则不渲染
  if (!content && !loading) return null;

  // 标题栏内容动态生成
  const labelContent = (
    <div className={styles.headerLabel}>
      {loading ? (
        <>
          <LuLoader className={styles.spinIcon} />
          <span>深度思考中...</span>
        </>
      ) : (
        // 完成状态：显示静态标题
        <span>思考过程</span>
      )}

      {/* 只有在生成结束后，才显示耗时 */}
      {!loading && duration !== undefined && <Tag className={styles.durationTag}>{duration}s</Tag>}
    </div>
  );

  return (
    <div className={styles.thinkingWrapper}>
      <Collapse
        ghost
        size="small"
        // 默认展开：如果正在加载中，通常默认展开给用户看；加载完后用户可以手动折叠
        defaultActiveKey={loading ? ['1'] : []}
        classNames={{
          header: styles.collapseHeader,
          body: styles.collapseContentBox,
        }}
        expandIcon={({ isActive }) => (
          <LuChevronRight
            size={14}
            style={{
              // 手动控制旋转，实现丝滑动画
              transform: `rotate(${isActive ? 90 : 0}deg)`,
              transition: 'transform 0.2s',
              marginTop: 2,
              opacity: 0.6,
            }}
          />
        )}
        items={[
          {
            key: '1',
            label: labelContent,
            // 即使 content 为空(刚开始loading)，也要渲染 div 撑开高度或显示占位
            children: (
              <Paragraph style={{ marginBottom: 0 }}>
                <blockquote className={styles.content}>{content}</blockquote>
              </Paragraph>
            ),
          },
        ]}
      />
    </div>
  );
};

export default ThinkingBlock;
