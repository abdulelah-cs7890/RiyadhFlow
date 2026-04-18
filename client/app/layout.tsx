import { ReactNode } from 'react'
import { Cairo } from 'next/font/google'
import './globals.css'
import { LocaleProvider } from './i18n/LocaleProvider'

const cairo = Cairo({ subsets: ['arabic', 'latin'], display: 'swap', variable: '--font-cairo' });

export const metadata = {
  title: 'RiyadhFlow',
  description: 'Smart route planning for Riyadh',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
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
      </body>
    </html>
  )
}
