'use client'

import { useCallback, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  Suggestion,
  fetchSuggestions,
  retrieveSuggestion,
} from '../services/searchSuggestions'
import { fetchDbSuggestions } from '../services/placesAutocomplete'

interface UseSearchSuggestionsResult {
  suggestions: Suggestion[];
  isLoading: boolean;
  search: (query: string) => void;
  select: (suggestion: Suggestion) => Promise<{ name: string; coords: [number, number] } | null>;
  clear: () => void;
}

export function useSearchSuggestions(): UseSearchSuggestionsResult {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();
  const sessionTokenRef = useRef(crypto.randomUUID());
  const locale = useLocale();
  const lang: 'en' | 'ar' = locale === 'ar' ? 'ar' : 'en';

  const search = useCallback((query: string) => {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      Promise.allSettled([
        fetchDbSuggestions(query, lang, controller.signal),
        fetchSuggestions(query, sessionTokenRef.current, controller.signal),
      ])
        .then(([dbRes, mbRes]) => {
          if (controller.signal.aborted) return;
          const db = dbRes.status === 'fulfilled' ? dbRes.value : [];
          const mb = mbRes.status === 'fulfilled' ? mbRes.value : [];
          const taken = new Set(db.map((s) => s.name.toLowerCase()));
          const merged = [
            ...db,
            ...mb.filter((s) => !taken.has(s.name.toLowerCase())),
          ].slice(0, 8);
          setSuggestions(merged);
          setIsLoading(false);
        });
    }, 300);
  }, [lang]);

  const select = useCallback(async (suggestion: Suggestion) => {
    setSuggestions([]);
    if (suggestion.source === 'db') {
      return { name: suggestion.name, coords: suggestion.coords };
    }
    const result = await retrieveSuggestion(suggestion.mapbox_id, sessionTokenRef.current);
    // Reset session token after a complete suggest→retrieve cycle
    sessionTokenRef.current = crypto.randomUUID();
    return result;
  }, []);

  const clear = useCallback(() => {
    clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setSuggestions([]);
    setIsLoading(false);
  }, []);

  return { suggestions, isLoading, search, select, clear };
}
