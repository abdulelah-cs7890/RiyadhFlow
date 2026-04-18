'use client'

import { useCallback, useRef, useState } from 'react'
import {
  Suggestion,
  fetchSuggestions,
  retrieveSuggestion,
} from '../services/searchSuggestions'

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

      fetchSuggestions(query, sessionTokenRef.current, controller.signal)
        .then((results) => {
          // Drop stale responses — a newer request has already superseded this one.
          if (controller.signal.aborted) return;
          setSuggestions(results);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (err instanceof Error && err.name !== 'AbortError') {
            setIsLoading(false);
          }
        });
    }, 300);
  }, []);

  const select = useCallback(async (suggestion: Suggestion) => {
    setSuggestions([]);
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
