import { Bot } from 'lucide-react';
import styles from './style.module.less';

function Welcome() {
  return (
    <div className={styles.welcomeWrapper}>
      <div className={styles.logoIcon}>
        <Bot />
      </div>

      {/* 标题 */}
      <div className={styles.title}>你好，我是AI助理小W</div>

      {/* 蓝色引导语 */}
      <div className={styles.subtitle}>今天想做点什么？</div>
    </div>
  );
}

export default Welcome;
