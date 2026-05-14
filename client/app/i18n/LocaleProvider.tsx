'use client';

import { NextIntlClientProvider } from 'next-intl';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import en from '@/messages/en.json';
import ar from '@/messages/ar.json';

type Locale = 'en' | 'ar';
const MESSAGES = { en, ar };
const Ctx = createContext<{ locale: Locale; setLocale: (l: Locale) => void } | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  // Don't write back to localStorage until we've finished reading the user's
  // stored preference. Otherwise the initial mount (with default 'en' state)
  // would clobber a previously-saved 'ar' before the read effect runs.
  const hydratedRef = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem('riyadhFlowLocale');
    if (stored === 'ar' || stored === 'en') setLocale(stored);
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    if (hydratedRef.current) {
      localStorage.setItem('riyadhFlowLocale', locale);
    }
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
