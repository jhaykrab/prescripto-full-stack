import React from 'react';
import { useTranslation } from 'react-i18next';

const CustomLanguageSwitcher = () => {
  const { i18n } = useTranslation();

  return (
    <select onChange={(e) => i18n.changeLanguage(e.target.value)} className='border rounded px-2 py-1'>
      {['en', 'fr', 'es', 'de', 'zh', 'hi'].map((lang) => (
        <option key={lang} value={lang}>{lang.toUpperCase()}</option>
      ))}
    </select>
  );
};

export default CustomLanguageSwitcher;