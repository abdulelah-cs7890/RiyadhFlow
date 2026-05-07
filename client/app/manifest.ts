import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'RiyadhFlow',
    short_name: 'RiyadhFlow',
    description: 'Smart route planning, prayer-aware ETAs, and Riyadh metro routing.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#10b981',
    categories: ['navigation', 'travel', 'maps'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
