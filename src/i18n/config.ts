import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import bn from './locales/bn.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      bn: { translation: bn },
    },
    fallbackLng: 'en',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

// Apply font class based on language
i18n.on('languageChanged', (lng) => {
  if (lng === 'bn') {
    document.body.classList.add('font-bengali');
    document.body.classList.remove('font-sans');
  } else {
    document.body.classList.add('font-sans');
    document.body.classList.remove('font-bengali');
  }
});

// Apply initial font class
const currentLang = i18n.language;
if (currentLang === 'bn') {
  document.body.classList.add('font-bengali');
  document.body.classList.remove('font-sans');
} else {
  document.body.classList.add('font-sans');
  document.body.classList.remove('font-bengali');
}

export default i18n;
