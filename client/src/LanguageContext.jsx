import React, { createContext, useContext, useState } from 'react';
import translations from './translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  const t = (key, ...args) => {
    const val = translations[lang][key];
    if (val === undefined) return key;
    if (typeof val === 'function') return val(...args);
    return val;
  };

  const isRTL = lang === 'he';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
