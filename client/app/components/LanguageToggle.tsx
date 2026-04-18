'use client';

import { useLocale } from '@/app/i18n/LocaleProvider';

export default function LanguageToggle() {
  const { locale, setLocale } = useLocale();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
      aria-label={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      title={locale === 'en' ? 'Switch to Arabic' : 'Switch to English'}
      style={{ fontWeight: 700, fontSize: '0.85rem' }}
    >
      {locale === 'en' ? 'ع' : 'EN'}
    </button>
  );
}
