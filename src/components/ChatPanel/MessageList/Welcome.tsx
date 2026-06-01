import React from 'react';
import { LuBot } from 'react-icons/lu';
import styles from './style.module.less';

interface WelcomeProps {
  onPromptClick?: (text: string) => void;
}

const SUGGESTED_PROMPTS = [
  { icon: '📝', label: '帮我写一份报告', text: '请帮我写一份课程报告的大纲' },
  { icon: '📖', label: '总结文档内容', text: '请帮我总结这份文档的主要内容' },
  { icon: '💡', label: '解释一个概念', text: '请用通俗易懂的方式解释一下什么是机器学习' },
  { icon: '🔍', label: '分析一组数据', text: '请帮我分析这组数据并给出改进建议' },
];

function Welcome({ onPromptClick }) {
  return (
    <div className={styles.welcomeWrapper}>
      <div className={styles.logoIcon}>
        <LuBot />
      </div>

      <div className={styles.title}>你好，我是AI助理小W</div>

      <div className={styles.subtitle}>今天想做点什么？</div>

      <div className={styles.promptSection}>
        <div className={styles.promptChips}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt.text}
              type="button"
              className={styles.promptChip}
              onClick={() => onPromptClick?.(prompt.text)}
            >
              <span className={styles.promptIcon}>{prompt.icon}</span>
              <span>{prompt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Welcome;
