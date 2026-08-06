import { useEffect, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import styles from './style.module.less';

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
} & Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'className' | 'style'>;

/**
 * 滚动渐入容器：进入视口时淡入上移，仅一次。
 * 其余 div 属性（如 data-demo）透传到容器，供 DemoPlayer 按属性定位。
 */
function Reveal({ children, className = '', delay = 0, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  // 无 IntersectionObserver 环境视为始终可见，直接静态展示
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');

  /**
   * @wisepen-manual-effect
   * 执行时机：挂载后观察容器，进入视口时置 visible 并断开观察器。
   * 不可替代原因：滚动显现只能靠 IO 判定可见性，无事件可替代。
   * cleanup：断开观察器，避免卸载后触发 setState。
   */
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -6% 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cls = `${styles.reveal}${visible ? ` ${styles.revealVisible}` : ''}${className ? ` ${className}` : ''}`;

  return (
    <div
      ref={ref}
      className={cls}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      {...rest}
    >
      {children}
    </div>
  );
}

export default Reveal;
