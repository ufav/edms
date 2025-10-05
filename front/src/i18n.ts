import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ru from './locales/ru/translation.json';
import en from './locales/en/translation.json';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

const saved = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const defaultLng = saved === 'en' || saved === 'ru' ? saved : 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
