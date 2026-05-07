export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <main className="offline-shell">
      <div className="offline-card">
        <div className="offline-emoji" aria-hidden>📡</div>
        <h1 className="offline-title">You&rsquo;re offline</h1>
        <p className="offline-body">
          RiyadhFlow needs an internet connection to load maps, routes, and place data.
          Reconnect and try again.
        </p>
        <p className="offline-body" lang="ar" dir="rtl">
          يتطلّب رياض-فلو اتصالاً بالإنترنت لتحميل الخرائط والمسارات والأماكن.
          أعد الاتصال ثم حاول مجدداً.
        </p>
        <a href="/" className="offline-retry">Retry</a>
      </div>
    </main>
  )
}
