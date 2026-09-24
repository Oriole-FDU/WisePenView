const READING_MODE_ACCENT_SURFACE_NEUTRAL_MIX_PERCENT = 40;
const READING_MODE_ACCENT_FOREGROUND_NEUTRAL_MIX_PERCENT = 10;

export function applyReadingModeToDOM(isReadingMode: boolean): void {
  document.documentElement.setAttribute('data-reading-mode', String(isReadingMode));
  document.documentElement.style.setProperty(
    '--palette-accent-surface-neutral-mix',
    isReadingMode ? `${READING_MODE_ACCENT_SURFACE_NEUTRAL_MIX_PERCENT}%` : '0%'
  );
  document.documentElement.style.setProperty(
    '--palette-accent-foreground-neutral-mix',
    isReadingMode ? `${READING_MODE_ACCENT_FOREGROUND_NEUTRAL_MIX_PERCENT}%` : '0%'
  );
}
