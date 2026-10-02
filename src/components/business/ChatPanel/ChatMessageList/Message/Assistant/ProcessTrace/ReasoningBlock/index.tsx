import type { ReasoningBlockProps } from './index.type';
import styles from './style.module.less';

/** 思考正文块：折叠面板里回放的推理文本，带独立滚动与高度上限。 */
function ReasoningBlock({ children }: ReasoningBlockProps) {
  return <blockquote className={styles.reasoning}>{children}</blockquote>;
}

export default ReasoningBlock;
