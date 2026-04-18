'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useEffect, useState } from 'react';
import en from '@/messages/en.json';
import ar from '@/messages/ar.json';

type Locale = 'en' | 'ar';
const MESSAGES = { en, ar };
const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void } | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    const stored = localStorage.getItem('riyadhFlowLocale');
    if (stored === 'ar' || stored === 'en') setLocale(stored);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('riyadhFlowLocale', locale);
  }, [locale]);

  return (
    <Ctx.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
        {children}
      </NextIntlClientProvider>
    </Ctx.Provider>
  );
}

export const useLocale = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLocale outside LocaleProvider');
  return c;
};
