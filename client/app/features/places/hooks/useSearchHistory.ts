'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'riyadhFlowSearchHistory'
const MAX_HISTORY = 5

interface UseSearchHistoryResult {
  history: string[];
  recordSearch: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

function persist(next: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* quota */ }
}

export function useSearchHistory(): UseSearchHistoryResult {
  const [history, setHistory] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setHistory(JSON.parse(stored) as string[])
    } catch {
      // corrupted — start fresh
    }
  }, [])

  const recordSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return
    setHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed.toLowerCase())
      const next = [trimmed, ...filtered].slice(0, MAX_HISTORY)
      persist(next)
      return next
    })
  }, [])

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((q) => q !== query)
      persist(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    persist([])
  }, [])

  return { history, recordSearch, removeFromHistory, clearHistory }
}
