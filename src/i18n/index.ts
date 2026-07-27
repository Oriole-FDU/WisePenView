import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { persistLanguage, resolveInitialLanguage, syncDocumentLanguage } from './language';
import { DEFAULT_LANGUAGE, I18N_NAMESPACES, resources, type SupportedLanguage } from './resources';

if (!i18n.isInitialized) {
  const initialLanguage = resolveInitialLanguage();
  syncDocumentLanguage(initialLanguage);

  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(resources),
    ns: Object.values(I18N_NAMESPACES),
    defaultNS: I18N_NAMESPACES.COMMON,
    interpolation: {
      escapeValue: false,
    },
  });
}

export async function changeAppLanguage(language: SupportedLanguage): Promise<void> {
  persistLanguage(language);
  syncDocumentLanguage(language);
  await i18n.changeLanguage(language);
}

export default i18n;
