import { Bot } from 'lucide-react';
import styles from './style.module.less';

function Welcome() {
  return (
    <div className={styles.welcomeWrapper}>
      <div className={styles.logoIcon}>
        <Bot aria-hidden="true" />
      </div>

      <div className={styles.title}>你好，我是 AI 助理小 W</div>

      <div className={styles.subtitle}>今天想做点什么？</div>
    </div>
  );
}

export default Welcome;
