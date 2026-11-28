import type { ColorScheme, ColorSchemeOption, ThemeMode } from '@/theme';

export type ThemeModeSectionProps = {
  value: string;
  onChange: (mode: ThemeMode) => void;
};

export type ColorSchemeSectionProps = {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
};

export type SchemeOptionProps = {
  option: ColorSchemeOption;
};
