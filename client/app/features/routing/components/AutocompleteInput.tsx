'use client'

import { memo, useCallback, useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Suggestion } from '../services/searchSuggestions'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { reverseGeocode } from '../services/geocoding'
import { useGeolocation } from '@/app/hooks/useGeolocation'

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (name: string, coords: [number, number]) => void;
  placeholder: string;
  label: string;
  icon: string;
  showCurrentLocation?: boolean;
  onCurrentLocation?: (coords: [number, number]) => void;
  onSubmit?: () => void;
}

function AutocompleteInput({
  value,
  onChange,
  onSelect,
  placeholder,
  label,
  icon,
  showCurrentLocation = false,
  onCurrentLocation,
  onSubmit,
}: AutocompleteInputProps) {
  const t = useTranslations('gps');
  const { suggestions, search, select, clear } = useSearchSuggestions();
  const listId = useId();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const geo = useGeolocation();
  const lastHandledCoordsRef = useRef<[number, number] | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        clear();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clear]);

  // When geolocation returns coords, reverse-geocode and notify parent.
  useEffect(() => {
    if (!geo.coords) return;
    if (lastHandledCoordsRef.current === geo.coords) return;
    lastHandledCoordsRef.current = geo.coords;
    const coords = geo.coords;
    let cancelled = false;
    (async () => {
      try {
        const name = await reverseGeocode(coords);
        if (cancelled) return;
        const resolvedName = name ?? t('currentLocation');
        onChange(resolvedName);
        onSelect(resolvedName, coords);
        onCurrentLocation?.(coords);
      } catch {
        if (cancelled) return;
        onChange(t('currentLocation'));
        onSelect(t('currentLocation'), coords);
        onCurrentLocation?.(coords);
      }
    })();
    return () => { cancelled = true };
  }, [geo.coords, onChange, onSelect, onCurrentLocation, t]);

  // Auto-dismiss the error toast after 2.5s.
  useEffect(() => {
    if (geo.status !== 'error') return;
    const timer = setTimeout(() => geo.clear(), 2500);
    return () => clearTimeout(timer);
  }, [geo.status, geo.clear]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      onChange(val);
      search(val);
      setIsOpen(true);
      setHighlightedIndex(-1);
    },
    [onChange, search],
  );

  const handleSelect = useCallback(
    async (suggestion: Suggestion) => {
      const result = await select(suggestion);
      if (result) {
        onChange(result.name);
        onSelect(result.name, result.coords);
      }
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [select, onChange, onSelect],
  );

  const handleFocus = useCallback(() => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    } else if (value.trim().length >= 2) {
      search(value);
      setIsOpen(true);
    }
  }, [suggestions.length, value, search]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isOpen && suggestions.length && highlightedIndex >= 0) {
          e.preventDefault();
          void handleSelect(suggestions[highlightedIndex]);
          return;
        }
        if (onSubmit) {
          e.preventDefault();
          setIsOpen(false);
          clear();
          onSubmit();
        }
        return;
      }

      if (!isOpen || !suggestions.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        clear();
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect, clear, onSubmit],
  );

  const showDropdown = isOpen && suggestions.length > 0;

  const gpsErrorMessage = geo.status === 'error'
    ? geo.errorCode === 1 ? t('accessDenied')
      : geo.errorCode === 2 ? t('unavailable')
      : geo.errorCode === 3 ? t('timedOut')
      : t('notSupported')
    : null;

  return (
    <div className="input-group" ref={wrapperRef}>
      <div className="input-label-row">
        <span className="input-label">{label}</span>
        <span className="input-icon">{icon}</span>
      </div>
      <div className="autocomplete-wrapper">
        <input
          className={`glass-input${showCurrentLocation ? ' has-gps-btn' : ''}`}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-controls={listId}
        />
        {showCurrentLocation && (
          <button
            type="button"
            className={`gps-btn gps-btn--${geo.status}`}
            onClick={geo.request}
            disabled={geo.status === 'loading'}
            title={
              geo.status === 'error'
                ? t('errorTitle')
                : t('useCurrentLocation')
            }
            aria-label={t('useCurrentLocation')}
          >
            {geo.status === 'loading' ? (
              <span className="gps-spinner" aria-hidden="true" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        )}
        {gpsErrorMessage && (
          <span className="gps-error-text" role="alert">{gpsErrorMessage}</span>
        )}
        {showDropdown && (
          <ul className="autocomplete-dropdown" id={listId} role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.mapbox_id}
                role="option"
                aria-selected={i === highlightedIndex}
                className={`autocomplete-item${i === highlightedIndex ? ' highlighted' : ''}`}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before select fires
                  void handleSelect(s);
                }}
              >
                <span className="autocomplete-item-name">{s.name}</span>
                <span className="autocomplete-item-address">
                  {s.place_formatted ?? s.full_address ?? ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(AutocompleteInput);
