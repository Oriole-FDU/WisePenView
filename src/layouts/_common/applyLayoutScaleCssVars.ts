import {
  getLayoutScaleCssVars,
  resolveLayoutDensity,
  resolveLayoutHeightDensity,
  type LayoutDensity,
  type LayoutHeightDensity,
  type LayoutScaleCssVarOptions,
} from '@/constants/layoutScale';

/** 将 Layout Scale 同步到 CSS 变量，保证 Less 与 TS 同源。 */
export const applyLayoutScaleCssVars = (
  target: CSSStyleDeclaration = document.documentElement.style,
  options: LayoutScaleCssVarOptions = {}
): void => {
  const vars = getLayoutScaleCssVars(options);
  for (const [name, value] of Object.entries(vars)) {
    target.setProperty(name, value);
  }
};

export const applyLayoutScaleDomAttrs = (
  widthDensity: LayoutDensity,
  heightDensity: LayoutHeightDensity,
  root: HTMLElement = document.documentElement
): void => {
  root.dataset.layoutDensity = widthDensity;
  root.dataset.layoutHeight = heightDensity;
};

export const syncViewportLayoutScale = (
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight
): { widthDensity: LayoutDensity; heightDensity: LayoutHeightDensity } => {
  const widthDensity = resolveLayoutDensity(viewportWidth);
  const heightDensity = resolveLayoutHeightDensity(viewportHeight);
  applyLayoutScaleDomAttrs(widthDensity, heightDensity);
  applyLayoutScaleCssVars(document.documentElement.style, { heightDensity });
  return { widthDensity, heightDensity };
};
