import { ReactNode } from 'react'
import { Cairo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'
import { LocaleProvider } from './i18n/LocaleProvider'
import RegisterServiceWorker from './components/RegisterServiceWorker'

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-cairo' });

export const metadata = {
  title: 'RiyadhFlow — Smart routing & places for Riyadh',
  description:
    'Plan drive, walk, bike, or metro routes across Riyadh with prayer-time awareness, speed-camera alerts, and Arabic-first UX.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
  themeColor: '#10b981',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'RiyadhFlow' },
  openGraph: {
    title: 'RiyadhFlow — Smart routing & places for Riyadh',
    description:
      'Plan drive, walk, bike, or metro routes across Riyadh with prayer-time awareness, speed-camera alerts, and Arabic-first UX.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ar_SA'],
    siteName: 'RiyadhFlow',
  },
  twitter: {
    card: 'summary',
    title: 'RiyadhFlow — Smart routing & places for Riyadh',
    description: 'Drive, walk, bike, or metro across Riyadh — with prayer-aware ETAs.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem('riyadhFlowLocale');if(l==='ar'||l==='en'){document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr';}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('riyadhFlowTheme')||'light'}catch(e){}`,
          }}
        />
      </head>
      <body className={cairo.variable}>
        <LocaleProvider>{children}</LocaleProvider>
        <RegisterServiceWorker />
        <Analytics />
      </body>
    </html>
  )
}
