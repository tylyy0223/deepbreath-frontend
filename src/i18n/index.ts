import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

const savedLang = localStorage.getItem('i18n_lang') || 'zh-CN';

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export const switchLang = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('i18n_lang', lang);
};

export default i18n;
