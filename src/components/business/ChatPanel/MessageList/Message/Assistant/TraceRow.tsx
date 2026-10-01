import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/base/Button';

import LoadingText from '../../../_common/LoadingText';
import styles from './ProcessTrace.module.less';
import TraceIcon from './TraceIcon';
import type { TraceHeadline, TraceItem } from './traceModel';
import { useCollapseHeight } from './useCollapseHeight';

interface TraceRowProps {
  /** 折叠面板正文；为空时整行只显示提示，不可展开 */
  children?: ReactNode;
  expanded: boolean;
  /** 行标文案与色调 */
  headline: TraceHeadline;
  /** 行首图标所属节点 */
  item: TraceItem;
  /** 流式中是否让行标做轮换动画 */
  animated: boolean;
  onToggle: () => void;
}

/**
 * 过程行的公共骨架：一行提示 + 指示箭头 + 可折叠正文。
 * 展开状态由调用方持有，这里只负责行标渲染、高度动画与折叠面板的可访问性关联。
 */
function TraceRow({ children, expanded, headline, item, animated, onToggle }: TraceRowProps) {
  const { t } = useTranslation('chat');
  const panelId = useId();
  const collapseRef = useCollapseHeight(expanded);
  const expandable = children != null;

  const rowContent = (
    <>
      <span key={item.key} className={styles.triggerMain}>
        <TraceIcon item={item} tone={headline.tone} className={styles.icon} />
        <span className={styles.labelClip}>
          <LoadingText tone={headline.tone} size="sm" animated={animated}>
            {t(headline.key, headline.options)}
          </LoadingText>
        </span>
      </span>
      {expandable ? (
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={styles.indicator}
          data-expanded={expanded ? 'true' : 'false'}
        />
      ) : null}
    </>
  );

  return (
    <>
      {expandable ? (
        <AppButton
          variant="ghost"
          size="sm"
          className={styles.trigger}
          aria-expanded={expanded}
          aria-controls={panelId}
          onPress={onToggle}
        >
          {rowContent}
        </AppButton>
      ) : (
        <div className={styles.hintRow}>{rowContent}</div>
      )}

      {expandable ? (
        <div ref={collapseRef} id={panelId} className={styles.collapse} aria-hidden={!expanded}>
          {children}
        </div>
      ) : null}
    </>
  );
}

export default TraceRow;
