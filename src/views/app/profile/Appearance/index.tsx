import {
  Button,
  Card,
  Dropdown,
  Heading,
  Label,
  Paragraph,
  ProgressBar,
  Separator,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@heroui/react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/Input';
import { changeAppLanguage } from '@/i18n';
import type { SupportedLanguage } from '@/i18n/resources';
import {
  COLOR_SCHEME_OPTIONS,
  THEME_FORM_RADIUS_OPTIONS,
  THEME_MODE_OPTIONS,
  THEME_RADIUS_OPTIONS,
  useAppTheme,
  useColorScheme,
  useThemeShape,
  type ColorScheme,
  type ColorSchemeOption,
  type ThemeFormRadius,
  type ThemeFormRadiusOption,
  type ThemeMode,
  type ThemeRadius,
  type ThemeRadiusOption,
} from '@/theme';

import layout from '../style.module.less';
import styles from './style.module.less';

type ThemeModeSectionProps = {
  value: string;
  onChange: (mode: ThemeMode) => void;
};

function ThemeModeSection({ value, onChange }: ThemeModeSectionProps) {
  const { t } = useTranslation('profile');

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.mode')}
      </Heading>
      <Tabs
        className={styles.modeTabs}
        selectedKey={value}
        onSelectionChange={(next) => onChange(String(next) as ThemeMode)}
      >
        <Tabs.ListContainer className={styles.modeTabsListContainer}>
          <Tabs.List className={styles.modeTabsList} aria-label={t('appearance.mode')}>
            {THEME_MODE_OPTIONS.map((option) => (
              <Tabs.Tab key={option.id} id={option.id} className={styles.modeTab}>
                {t(option.labelKey)}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </section>
  );
}

type ColorSchemeSectionProps = {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
};

function ColorSchemeSection({ value, onChange }: ColorSchemeSectionProps) {
  const { t } = useTranslation('profile');

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.colorScheme')}
      </Heading>
      <div className={styles.schemeGrid}>
        <ToggleButtonGroup
          aria-label={t('appearance.colorScheme')}
          selectionMode="single"
          selectedKeys={new Set([value])}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key != null) onChange(String(key) as ColorScheme);
          }}
          className={styles.schemeGroup}
          orientation="horizontal"
          isDetached
        >
          {COLOR_SCHEME_OPTIONS.map((option) => (
            <SchemeOption key={option.id} option={option} />
          ))}
        </ToggleButtonGroup>
      </div>
    </section>
  );
}

type ThemeShapeSectionProps = {
  radius: ThemeRadius;
  formRadius: ThemeFormRadius;
  onRadiusChange: (radius: ThemeRadius) => void;
  onFormRadiusChange: (radius: ThemeFormRadius) => void;
};

function ThemeShapeSection({
  radius,
  formRadius,
  onRadiusChange,
  onFormRadiusChange,
}: ThemeShapeSectionProps) {
  const { t } = useTranslation('profile');

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.radius')}
      </Heading>
      <div className={styles.shapeControls}>
        <ShapeOptionGroup
          label="Radius"
          value={radius}
          options={THEME_RADIUS_OPTIONS}
          onChange={(next) => onRadiusChange(next as ThemeRadius)}
        />
        <ShapeOptionGroup
          label="Radius Form"
          value={formRadius}
          options={THEME_FORM_RADIUS_OPTIONS}
          onChange={(next) => onFormRadiusChange(next as ThemeFormRadius)}
        />
      </div>
    </section>
  );
}

type ShapeOptionGroupProps = {
  label: string;
  value: ThemeRadius | ThemeFormRadius;
  options: Array<ThemeRadiusOption | ThemeFormRadiusOption>;
  onChange: (radius: ThemeRadius | ThemeFormRadius) => void;
};

function ShapeOptionGroup({ label, value, options, onChange }: ShapeOptionGroupProps) {
  return (
    <div className={styles.shapeGroupBlock}>
      <span className={styles.shapeGroupLabel}>{label}</span>
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key != null) onChange(String(key) as ThemeRadius | ThemeFormRadius);
        }}
        className={styles.shapeGroup}
        orientation="horizontal"
        isDetached
      >
        {options.map((option) => {
          const pxLabel = option.description === '0' ? '0px' : option.description;
          return (
            <ToggleButton
              key={option.id}
              id={option.id}
              data-radius={option.id}
              className={styles.shapeOption}
              aria-label={`${label} ${option.label} ${pxLabel}`}
            >
              <span className={styles.shapeCorner} aria-hidden />
              <span className={styles.shapeMeta}>
                <span className={styles.shapeLabel}>{option.label}</span>
                <span className={styles.shapeValue}>{pxLabel}</span>
              </span>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>
    </div>
  );
}

type SchemeOptionProps = {
  option: ColorSchemeOption;
};

function SchemeOption({ option }: SchemeOptionProps) {
  const { t } = useTranslation('profile');

  return (
    <ToggleButton id={option.id} data-scheme-preview={option.id} className={styles.schemeOption}>
      <span className={styles.schemePreview}>
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
      </span>
      <span className={styles.schemeLabel}>{t(option.labelKey)}</span>
      <span className={styles.schemeDescription}>{t(option.descriptionKey)}</span>
    </ToggleButton>
  );
}

function ThemeVariantPreview() {
  const { t } = useTranslation('profile');

  return (
    <div className={styles.variantPreview}>
      <span className={styles.variantPreviewTitle}>{t('appearance.preview.buttonVariants')}</span>
      <div className={styles.variantRow}>
        <span className={styles.variantRowLabel}>{t('appearance.preview.accent')}</span>
        <div className={styles.variantRowActions}>
          <Button size="sm" variant="primary">
            {t('appearance.preview.solid')}
          </Button>
          <Button size="sm" variant="secondary" className={styles.variantSoftAccent}>
            {t('appearance.preview.soft')}
          </Button>
          <Button size="sm" variant="outline">
            {t('appearance.preview.outline')}
          </Button>
          <Button size="sm" variant="ghost">
            {t('appearance.preview.ghost')}
          </Button>
        </div>
      </div>
      <div className={styles.variantRow}>
        <span className={styles.variantRowLabel}>{t('appearance.preview.gray')}</span>
        <div className={styles.variantRowActions}>
          <Button size="sm" variant="secondary">
            {t('appearance.preview.solid')}
          </Button>
          <Button size="sm" variant="tertiary">
            {t('appearance.preview.soft')}
          </Button>
          <Button size="sm" variant="outline" className={styles.variantOutlineGray}>
            {t('appearance.preview.outline')}
          </Button>
          <Button size="sm" variant="ghost" className={styles.variantGhostGray}>
            {t('appearance.preview.ghost')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ThemePreviewSection() {
  const { t } = useTranslation(['profile', 'common']);

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.preview.title')}
      </Heading>
      <div className={styles.previewGrid}>
        <Card className={styles.previewCard}>
          <Card.Content className={styles.previewBody}>
            <ThemeVariantPreview />
            <div className={styles.previewActions}>
              <Button variant="primary">{t('appearance.preview.primary')}</Button>
              <Button variant="secondary">{t('appearance.preview.secondary')}</Button>
              <Dropdown>
                <Dropdown.Trigger>
                  <Button variant="tertiary">
                    {t('appearance.preview.menu')}
                    <ChevronDown size={14} />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label={t('appearance.preview.menuAria')}>
                    <Dropdown.Item key="edit">{t('actions.edit', { ns: 'common' })}</Dropdown.Item>
                    <Dropdown.Item key="copy">{t('actions.copy', { ns: 'common' })}</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
            <TextField
              aria-label={t('appearance.preview.inputAria')}
              className={styles.previewField}
            >
              <Label>{t('appearance.preview.inputLabel')}</Label>
              <Input placeholder={t('appearance.preview.inputPlaceholder')} />
            </TextField>
            <ProgressBar
              aria-label={t('appearance.preview.progressAria')}
              value={64}
              valueLabel="64%"
              className={styles.previewProgress}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
              <ProgressBar.Output />
            </ProgressBar>
          </Card.Content>
        </Card>

        <div className={styles.previewDialog}>
          <div className={styles.previewDialogHeader}>
            <span>{t('appearance.preview.shell')}</span>
          </div>
          <div className={styles.previewTable}>
            <div className={styles.previewTableRow}>
              <span>{t('appearance.preview.button')}</span>
              <span>--radius-3xl</span>
            </div>
            <div className={styles.previewTableRow}>
              <span>{t('appearance.preview.input')}</span>
              <span>--radius-field</span>
            </div>
            <div className={styles.previewTableRow}>
              <span>{t('appearance.preview.table')}</span>
              <span>--table-shell-radius</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppearanceHeader() {
  const { t } = useTranslation('profile');

  return (
    <header className={layout.pageHeader}>
      <Heading level={1} className={layout.pageTitle}>
        {t('appearance.title')}
      </Heading>
      <Paragraph size="sm" color="muted" className={layout.pageSubtitle}>
        {t('appearance.subtitle')}
      </Paragraph>
    </header>
  );
}

function LanguageSection() {
  const { i18n, t } = useTranslation(['profile', 'common']);
  const selectedLanguage: SupportedLanguage = i18n.resolvedLanguage === 'en-US' ? 'en-US' : 'zh-CN';

  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        {t('appearance.language')}
      </Heading>
      <Tabs
        className={styles.modeTabs}
        selectedKey={selectedLanguage}
        onSelectionChange={(next) => void changeAppLanguage(String(next) as SupportedLanguage)}
      >
        <Tabs.ListContainer className={styles.modeTabsListContainer}>
          <Tabs.List className={styles.modeTabsList} aria-label={t('appearance.languageAria')}>
            <Tabs.Tab id="zh-CN" className={styles.modeTab}>
              {t('language.zhCN', { ns: 'common' })}
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="en-US" className={styles.modeTab}>
              {t('language.enUS', { ns: 'common' })}
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </section>
  );
}

function Appearance() {
  const { theme, setTheme } = useAppTheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { radius, formRadius, setRadius, setFormRadius } = useThemeShape();

  return (
    <div className={layout.pageContainer}>
      <AppearanceHeader />
      <Card className={styles.panel}>
        <Card.Content className={styles.body}>
          <LanguageSection />
          <Separator className={styles.divider} />
          <ThemeModeSection value={theme} onChange={setTheme} />
          <Separator className={styles.divider} />
          <ColorSchemeSection value={colorScheme} onChange={setColorScheme} />
          <Separator className={styles.divider} />
          <ThemeShapeSection
            radius={radius}
            formRadius={formRadius}
            onRadiusChange={setRadius}
            onFormRadiusChange={setFormRadius}
          />
          <Separator className={styles.divider} />
          <ThemePreviewSection />
        </Card.Content>
      </Card>
    </div>
  );
}

export default Appearance;
