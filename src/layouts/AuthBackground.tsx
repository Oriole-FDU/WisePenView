import styles from './AuthBackground.module.less';

/** 认证页全屏装饰背景（光斑、圆点、线条），随 HeroUI CSS 变量切换明暗 */
function AuthBackground() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={`${styles.blob} ${styles.blobPrimary} ${styles.pulse}`} />
      <div className={`${styles.blob} ${styles.blobAccent} ${styles.pulse} ${styles.delay1}`} />
      <div className={`${styles.blob} ${styles.blobBlend} ${styles.pulse} ${styles.delay2}`} />

      <div
        className={`${styles.dot} ${styles.dotSm} ${styles.dotPrimary} ${styles.float} ${styles.dotTopLeft}`}
      />
      <div
        className={`${styles.dot} ${styles.dotMd} ${styles.dotFocus} ${styles.float} ${styles.dotTopRight} ${styles.delay05}`}
      />
      <div
        className={`${styles.dot} ${styles.dotSm} ${styles.dotPrimaryHover} ${styles.float} ${styles.dotBottomLeft} ${styles.delay1}`}
      />
      <div
        className={`${styles.dot} ${styles.dotMd} ${styles.dotPrimarySoft} ${styles.float} ${styles.dotBottomRight} ${styles.delay15}`}
      />

      <svg
        className={`${styles.decorSvg} ${styles.decorCurve}`}
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <path className={styles.decorPath} d="M10 50 Q 30 20, 50 50 T 90 50" />
      </svg>

      <svg
        className={`${styles.decorSvg} ${styles.decorCircle}`}
        width="120"
        height="120"
        viewBox="0 0 120 120"
      >
        <circle className={styles.decorCircleStroke} cx="60" cy="60" r="50" />
      </svg>
    </div>
  );
}

export default AuthBackground;
