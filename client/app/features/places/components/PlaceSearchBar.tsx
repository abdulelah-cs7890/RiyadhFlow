'use client'

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PlaceData } from '@/app/utils/mockData'
import { useSearchSuggestions } from '@/app/features/routing/hooks/useSearchSuggestions'
import { Suggestion } from '@/app/features/routing/services/searchSuggestions'

interface PlaceSearchBarProps {
  onSelect: (place: PlaceData) => void;
  anchorCoords?: [number, number] | null;
}

function PlaceSearchBar({ onSelect, anchorCoords = null }: PlaceSearchBarProps) {
  const t = useTranslations('places');
  const { suggestions, search, select, clear } = useSearchSuggestions(anchorCoords);
  const [value, setValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const resetBar = useCallback(() => {
    setValue('');
    setIsOpen(false);
    setHighlightedIndex(-1);
    clear();
  }, [clear]);

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      const result = await select(suggestion);
      if (!result) {
        resetBar();
        return;
      }
      const address =
        suggestion.source === 'db'
          ? suggestion.place_formatted ?? ''
          : suggestion.place_formatted ?? suggestion.full_address ?? '';
      const place: PlaceData = {
        name: result.name,
        coords: result.coords,
        type: t('searchResultType'),
        address,
      };
      onSelect(place);
      resetBar();
    },
    [select, onSelect, resetBar, t],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    search(v);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      resetBar();
      return;
    }
    if (!isOpen || !suggestions.length) {
      if (e.key === 'ArrowDown' && value.trim().length >= 2) {
        search(value);
        setIsOpen(true);
      }
      return;
    }
    if (e.key === 'Enter') {
      if (highlightedIndex >= 0) {
        e.preventDefault();
        void handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 || value.trim().length >= 2) setIsOpen(true);
  };

  const showDropdown = isOpen && suggestions.length > 0;

  return (
    <div className="place-search-wrap" ref={wrapperRef}>
      <div className="input-label-row">
        <span className="input-label">{t('searchLabel')}</span>
        <span className="input-icon" aria-hidden="true">🔎</span>
      </div>
      <div className="place-search-input-row">
        <span className="place-search-icon" aria-hidden="true">🔎</span>
        <input
          className="glass-input place-search-input"
          type="text"
          placeholder={t('searchPlaceholder')}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={listId}
        />
        {value.length > 0 && (
          <button
            type="button"
            className="place-search-clear-btn"
            onClick={resetBar}
            aria-label={t('searchClear')}
            title={t('searchClear')}
          >
            ✕
          </button>
        )}
      </div>
      {showDropdown && (
        <ul className="autocomplete-dropdown place-search-dropdown" id={listId} role="listbox">
          {suggestions.map((s, i) => {
            const key = s.source === 'db' ? s.id : s.mapbox_id;
            const address =
              s.source === 'db'
                ? s.place_formatted ?? ''
                : s.place_formatted ?? s.full_address ?? '';
            return (
              <li
                key={key}
                role="option"
                aria-selected={i === highlightedIndex}
                className={`autocomplete-item${i === highlightedIndex ? ' highlighted' : ''}`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleSelect(s);
                }}
              >
                <span className="autocomplete-item-name">
                  {s.source === 'db' ? `📍 ${s.name}` : s.name}
                </span>
                <span className="autocomplete-item-address">{address}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default memo(PlaceSearchBar);
