import { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { LocaleProvider } from '@/app/i18n/LocaleProvider'

type Locale = 'en' | 'ar'

// Some test files (e.g. trips) replace globalThis.localStorage with a custom
// shim. To keep this helper resilient regardless of test order, install a
// minimal in-memory Storage if the current localStorage is missing methods.
function ensureLocalStorage() {
  const ls = (globalThis as { localStorage?: Partial<Storage> }).localStorage
  if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return
  const store: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v) },
      removeItem: (k: string) => { delete store[k] },
      clear: () => { for (const k of Object.keys(store)) delete store[k] },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length },
    },
    writable: true,
    configurable: true,
  })
}

function makeWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <LocaleProvider>{children}</LocaleProvider>
  }
}

export function renderWithIntl(
  ui: ReactElement,
  options: RenderOptions & { locale?: Locale } = {},
) {
  const { locale = 'en', ...rest } = options
  ensureLocalStorage()
  // LocaleProvider reads `riyadhFlowLocale` from localStorage on mount, so we
  // seed it before render to drive the locale deterministically.
  localStorage.setItem('riyadhFlowLocale', locale)
  return render(ui, { wrapper: makeWrapper(), ...rest })
}
