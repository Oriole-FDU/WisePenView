import React from 'react';
import { Progress } from 'antd';
import type { ProgressProps } from 'antd';
import type { QuotaBarProps } from './index.type';
import styles from './style.module.less';

// 样式参考https://ant.design/components/progress-cn的"自定义语义结构的样式和类"章节

const QuotaBar: React.FC<QuotaBarProps> = ({ used = 0, limit }) => {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

  const getProgressColor = (): string => {
    if (percentage >= 100) {
      return '#ff4d4f'; // 红色
    } else if (percentage >= 80) {
      return '#faad14'; // 黄色
    } else {
      return '#1890ff'; // 蓝色
    }
  };

  const stylesFn: ProgressProps['styles'] = () => {
    return {
      rail: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: '6px',
      },
      track: {
        backgroundColor: getProgressColor(),
        borderRadius: '6px',
        transition: 'all 0.3s ease',
      },
    } satisfies ProgressProps['styles'];
  };

  return (
    <div className={styles.quotaBar}>
      <div className={styles.quotaBarProgress}>
        <Progress styles={stylesFn} percent={percentage} showInfo={false} />
      </div>
      <span className={styles.quotaBarText}>
        {`${used.toLocaleString()} / ${limit.toLocaleString()}`}
      </span>
    </div>
  );
};

export default QuotaBar;
