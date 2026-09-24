import { type ColorScheme, DEFAULT_COLOR_SCHEME } from './constants';
import { COLOR_SCHEME_ICON_SRC } from './iconAssets';

export function applyColorSchemeToDOM(scheme: ColorScheme): void {
  document.documentElement.setAttribute('data-color-scheme', scheme);
}

export function applyColorSchemeFavicon(scheme: ColorScheme): void {
  if (typeof document === 'undefined') return;

  const href = COLOR_SCHEME_ICON_SRC[scheme] ?? COLOR_SCHEME_ICON_SRC[DEFAULT_COLOR_SCHEME];
  const existingLink = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  const link = existingLink ?? document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = href;

  if (!existingLink) {
    document.head.appendChild(link);
  }
}
