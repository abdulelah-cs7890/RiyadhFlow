import type { ReactNode } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import en from '../messages/en.json'

export function IntlDecorator({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={en}>
      {children}
    </NextIntlClientProvider>
  )
}
