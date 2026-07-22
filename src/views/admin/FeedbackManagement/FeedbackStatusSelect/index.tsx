import { Button, Dropdown } from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import type { Key } from 'react';
import {
  FEEDBACK_STATUS_LABEL,
  FEEDBACK_STATUS_OPTIONS,
  type FeedbackStatus,
} from '../FeedbackDetailDialog/index.type';
import styles from './style.module.less';

interface FeedbackStatusSelectProps {
  status: FeedbackStatus;
  onChange: (status: FeedbackStatus) => void;
  ariaLabel?: string;
  className?: string;
}

function isFeedbackStatus(value: string): value is FeedbackStatus {
  return value === 'PENDING' || value === 'PROCESSING' || value === 'RESOLVED';
}

function FeedbackStatusSelect({
  status,
  onChange,
  ariaLabel = '处理状态',
  className,
}: FeedbackStatusSelectProps) {
  const handleAction = (key: Key) => {
    const nextStatus = String(key);
    if (!isFeedbackStatus(nextStatus) || nextStatus === status) return;
    onChange(nextStatus);
  };

  return (
    <div
      className={className}
      // 阻止触发行点击打开详情
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Dropdown>
        <Dropdown.Trigger>
          <Button variant="secondary" size="sm" className={styles.trigger} aria-label={ariaLabel}>
            <span>{FEEDBACK_STATUS_LABEL[status]}</span>
            <ChevronDown size={16} aria-hidden />
          </Button>
        </Dropdown.Trigger>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu
            aria-label={ariaLabel}
            selectedKeys={new Set([status])}
            selectionMode="single"
            onAction={handleAction}
          >
            {FEEDBACK_STATUS_OPTIONS.map((option) => (
              <Dropdown.Item key={option.value} id={option.value} textValue={option.label}>
                {option.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}

export default FeedbackStatusSelect;
