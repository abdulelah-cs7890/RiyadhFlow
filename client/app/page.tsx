'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Map from './components/Map'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PlaceData } from './utils/mockData'
import { useRoutePlanner } from './features/routing/hooks/useRoutePlanner'
import { useUrlSyncedRouteState } from './features/routing/hooks/useUrlSyncedRouteState'
import { useSavedTrips } from './features/trips/hooks/useSavedTrips'
import { useRecentTrips } from './features/trips/hooks/useRecentTrips'
import { usePlaces } from './features/places/hooks/usePlaces'
import CategoryBar from './features/places/components/CategoryBar'
import PlaceCard from './features/places/components/PlaceCard'
import PlaceSearchBar from './features/places/components/PlaceSearchBar'
import { categoryPills } from './features/places/constants/categoryPills'
import { RouteAlternative } from './features/routing/types'
import RouteAlternativesPanel from './features/routing/components/RouteAlternativesPanel'
import RouteSummaryCard from './features/routing/components/RouteSummaryCard'
import TravelModeSwitcher from './features/routing/components/TravelModeSwitcher'
import ThemeToggle from './features/theme/components/ThemeToggle'
import { useTheme } from './features/theme/hooks/useTheme'
import AutocompleteInput from './features/routing/components/AutocompleteInput'
import BestTimePanel from './features/routing/components/BestTimePanel'
import TransitSummaryCard from './features/routing/components/TransitSummaryCard'
import TurnByTurnPanel from './features/routing/components/TurnByTurnPanel'
import WaypointsList from './features/routing/components/WaypointsList'
import { ROUTE_LABEL_KEYS } from './features/routing/types'
import { buildGoogleMapsUrl } from './features/routing/utils/deeplinks'
import { parseUrlRouteState, buildUrlWithRouteState } from './features/routing/utils/urlState'
import LanguageToggle from './components/LanguageToggle'
import { useGeolocation } from './hooks/useGeolocation'
import PrayerStatusPill from './features/prayer/components/PrayerStatusPill'
import { usePrayerTimes } from './features/prayer/hooks/usePrayerTimes'
import type { PrayerWarning } from './features/places/components/PlaceCard'

const PRAYER_CLOSURE_CATEGORIES = new Set(['Restaurants', 'Hotels', 'Museums', 'Pharmacies', 'Malls'])
const PRAYER_WARNING_WINDOW_MINS = 20

const PRAYER_NAME_KEY: Record<string, string> = {
  Fajr: 'fajr',
  Dhuhr: 'dhuhr',
  Asr: 'asr',
  Maghrib: 'maghrib',
  Isha: 'isha',
}

export default function Home() {
  const tRouting = useTranslations('routing');
  const tTrips = useTranslations('trips');
  const tInsights = useTranslations('insights');
  const tPlaces = useTranslations('places');
  const tUi = useTranslations('ui');
  const tErrors = useTranslations('errors');
  const {
    startLocation,
    setStartLocation,
    destination,
    setDestination,
    activeCategory,
    setActiveCategory,
    travelMode,
    setTravelMode,
    waypoints,
    setWaypoints,
  } = useUrlSyncedRouteState();
  const { theme, toggleTheme } = useTheme();
  const { trips: savedTrips, saveTrip, deleteTrip } = useSavedTrips();
  const { recents, recordRecent, clearRecents } = useRecentTrips();
  const tPrayer = useTranslations('prayer');
  const { next: nextPrayer } = usePrayerTimes();
  const {
    routeCoords,
    waypointCoords,
    routeInfo,
    insights,
    transit,
    isCalculating,
    error,
    findRoute,
    retry,
    canRetry,
    handleRouteFetched,
    resetRoute,
    clearError,
  } = useRoutePlanner();
  const nearMe = useGeolocation();
  const [nearMeActive, setNearMeActive] = useState(false);
  const placesUserLocation = nearMeActive ? nearMe.coords : null;
  const { places, isLoading: placesLoading } = usePlaces(activeCategory, placesUserLocation);

  const pathname = usePathname();
  const [selectedPlace, setSelectedPlace] = useState<PlaceData | null>(null);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [isSwapping, setIsSwapping] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [shareFlash, setShareFlash] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [startCoords, setStartCoords] = useState<[number, number] | null>(null);
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<[number, number] | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [fitRouteSignal, setFitRouteSignal] = useState(0);
  const [trafficVisible, setTrafficVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const result = parseUrlRouteState(window.location.search);
      if (result.startCoords) setStartCoords(result.startCoords);
      if (result.destCoords) setDestCoords(result.destCoords);
    }
  }, []);

  useEffect(() => {
    setSelectedPlace(null);
  }, [activeCategory]);

  useEffect(() => {
    if (!nearMeActive || !nearMe.coords) return;
    setUserLocation([...nearMe.coords]);
    setFlyToLocation([...nearMe.coords]);
  }, [nearMeActive, nearMe.coords]);

  useEffect(() => {
    if (nearMe.status !== 'error') return;
    const timer = setTimeout(() => {
      nearMe.clear();
      setNearMeActive(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [nearMe.status, nearMe.clear]);

  useEffect(() => {
    if (!routeInfo || travelMode === 'metro') return;
    if (!startLocation || !destination) return;
    recordRecent(startLocation, destination, startCoords, destCoords);
    // deps intentionally narrow: only fire on new route completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeInfo]);

  useEffect(() => {
    if (travelMode !== 'metro' || transit.kind !== 'ready') return;
    if (!startLocation || !destination) return;
    recordRecent(startLocation, destination, startCoords, destCoords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transit.kind]);

  const handleNearMeToggle = useCallback(() => {
    if (nearMeActive) {
      setNearMeActive(false);
      nearMe.clear();
    } else {
      setNearMeActive(true);
      nearMe.request();
    }
  }, [nearMeActive, nearMe]);

  const handleSaveTrip = () => {
    const ok = saveTrip(startLocation, destination, startCoords, destCoords);
    if (ok) {
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 1500);
    }
  };

  const handleShareLink = async () => {
    const shareUrl = window.location.origin + buildUrlWithRouteState(pathname, {
      start: startLocation,
      destination,
      category: activeCategory,
      mode: travelMode,
      startCoords: startCoords ?? undefined,
      destCoords: destCoords ?? undefined,
      ...(waypoints.length > 0 ? { waypoints } : {}),
    });
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareFlash(true);
      setTimeout(() => setShareFlash(false), 1500);
    } catch {
      window.prompt('Copy this link:', shareUrl);
    }
  };

  const handleLoadTrip = (trip: {
    start: string;
    dest: string;
    startCoords?: [number, number];
    destCoords?: [number, number];
  }) => {
    setStartLocation(trip.start);
    setDestination(trip.dest);
    setStartCoords(trip.startCoords ?? null);
    setDestCoords(trip.destCoords ?? null);
  };

  const handleFindRoute = useCallback(async (
    destinationOverride?: string,
    destinationCoordsOverride?: [number, number],
  ) => {
    const resolvedDestination = destinationOverride ?? destination;
    if (destinationOverride) setDestination(destinationOverride);
    if (destinationCoordsOverride) setDestCoords(destinationCoordsOverride);
    setRouteAlternatives([]);
    setSelectedRouteIndex(0);

    const endCoords = destinationCoordsOverride
      ?? (destinationOverride ? undefined : (destCoords ?? undefined));

    await findRoute(startLocation, resolvedDestination, {
      start: startCoords ?? undefined,
      end: endCoords,
      travelMode,
      waypoints,
    });
  }, [destination, destCoords, findRoute, startCoords, startLocation, setDestination, travelMode, waypoints]);

  const handleSwap = useCallback(() => {
    setIsSwapping(true);
    setStartLocation(destination);
    setDestination(startLocation);
    setStartCoords(destCoords);
    setDestCoords(startCoords);
    setTimeout(() => setIsSwapping(false), 350);
  }, [destination, destCoords, startCoords, startLocation]);

  const handleReset = useCallback(() => {
    resetRoute();
    setStartLocation('');
    setDestination('');
    setStartCoords(null);
    setDestCoords(null);
    setWaypoints([]);
    setRouteAlternatives([]);
    setSelectedRouteIndex(0);
    setFlyToLocation(null);
    setUserLocation(null);
    setSelectedPlace(null);
    setNearMeActive(false);
    nearMe.clear();
  }, [resetRoute, setStartLocation, setDestination, setWaypoints, nearMe]);

  const hasRoutingState = Boolean(
    routeInfo || startLocation || destination || startCoords || destCoords
  );

  const handleRouteAlternativesFetched = useCallback((alternatives: RouteAlternative[]) => {
    setRouteAlternatives(alternatives);
    if (alternatives.length && selectedRouteIndex >= alternatives.length) {
      setSelectedRouteIndex(0);
    }
  }, [selectedRouteIndex]);

  const handleMapClick = useCallback((coords: [number, number], placeName: string | null) => {
    setDestination(placeName ?? tUi('droppedPin'));
    setDestCoords(coords);
  }, [setDestination, tUi]);

  // Bottom-sheet drag (mobile only). Desktop ignores the handle (display: none in CSS).
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const dragStartYRef = useRef<number | null>(null);
  const wasDragRef = useRef(false);

  const onSheetPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY;
    wasDragRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onSheetPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const delta = e.clientY - dragStartYRef.current;
    if (Math.abs(delta) > 4) wasDragRef.current = true;
    // Clamp: only allow downward drag from expanded, only upward from collapsed.
    setDragDelta(sheetCollapsed ? Math.min(0, delta) : Math.max(0, delta));
  }, [sheetCollapsed]);

  const onSheetPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const delta = e.clientY - dragStartYRef.current;
    dragStartYRef.current = null;
    // Asymmetric thresholds: collapsing requires a clear downward intent,
    // expanding is generous so a quick upward tug always wins.
    const COLLAPSE_THRESHOLD = 80;
    const EXPAND_THRESHOLD = 30;
    if (wasDragRef.current) {
      if (!sheetCollapsed && delta > COLLAPSE_THRESHOLD) setSheetCollapsed(true);
      else if (sheetCollapsed && delta < -EXPAND_THRESHOLD) setSheetCollapsed(false);
    } else {
      // Tap on handle: toggle.
      setSheetCollapsed((c) => !c);
    }
    setDragDelta(0);
  }, [sheetCollapsed]);

  const sheetStyle: React.CSSProperties | undefined = dragDelta !== 0
    ? sheetCollapsed
      ? { transform: `translateY(calc(100% - 64px + ${dragDelta}px))`, transition: 'none' }
      : { transform: `translateY(${dragDelta}px)`, transition: 'none' }
    : undefined;

  return (
    <main className="app-container">
      <div
        className={`glass-pane${sheetCollapsed ? ' is-collapsed' : ''}`}
        style={sheetStyle}
        onClick={(e) => {
          // When collapsed, tapping anywhere on the visible peek expands.
          // The handle already has its own pointerup → toggle handler; let it
          // win and bail out if it was the target.
          if (!sheetCollapsed) return;
          const target = e.target as HTMLElement;
          if (target.closest('.sheet-handle')) return;
          setSheetCollapsed(false);
        }}
      >
        <div
          className="sheet-handle"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
          role="button"
          tabIndex={0}
          aria-label={tUi('toggleSheet')}
          aria-expanded={!sheetCollapsed}
        >
          <span className="sheet-handle-bar" />
        </div>
        <div className="glass-pane-header">
          <h2 className="title">
            {tUi('appTitle')}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <PrayerStatusPill
                userCoords={userLocation ?? startCoords}
                onShowNearestMosque={(place) => {
                  setSelectedPlace(place);
                  setFlyToLocation(place.coords);
                }}
              />
              <LanguageToggle />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </span>
          </h2>
        </div>

        <div className="place-search-section">
          <PlaceSearchBar
            anchorCoords={userLocation ?? startCoords}
            onSelect={(place) => {
              setSelectedPlace(place);
              setFlyToLocation(place.coords);
            }}
          />
        </div>

        <div className={`routing-container${isSwapping ? ' is-swapping' : ''}`}>
          <AutocompleteInput
            value={startLocation}
            onChange={(v) => { setStartLocation(v); setStartCoords(null); }}
            onSelect={(name, coords) => { setStartLocation(name); setStartCoords(coords); }}
            placeholder={tRouting('startPlaceholder')}
            label={tRouting('startLabel')}
            icon="🚩"
            showCurrentLocation
            onCurrentLocation={(coords) => {
              setUserLocation([...coords]);
              setFlyToLocation([...coords]);
            }}
            onSubmit={() => void handleFindRoute()}
            anchorCoords={userLocation ?? destCoords}
          />

          <button
            className={`swap-btn ${isSwapping ? 'is-swapping' : ''}`}
            onClick={handleSwap}
            title={tRouting('swapLocations')}
            aria-label={tRouting('swapAriaLabel')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M5 1L2 4.5h2.2V11H5V4.5h2.2L5 1z" fill="currentColor"/>
              <path d="M11 15l3-3.5h-2.2V5H11v6.5H8.8L11 15z" fill="currentColor"/>
            </svg>
          </button>

          <WaypointsList
            waypoints={waypoints}
            onChange={setWaypoints}
            disabled={travelMode === 'metro'}
            anchorCoords={userLocation ?? startCoords ?? destCoords}
            onSubmit={() => void handleFindRoute()}
          />

          <AutocompleteInput
            value={destination}
            onChange={(v) => { setDestination(v); setDestCoords(null); }}
            onSelect={(name, coords) => { setDestination(name); setDestCoords(coords); }}
            placeholder={tRouting('destinationPlaceholder')}
            label={tRouting('destinationLabel')}
            icon="📍"
            onSubmit={() => void handleFindRoute()}
            anchorCoords={userLocation ?? startCoords}
          />
        </div>

        {travelMode === 'metro' && waypoints.length > 0 && (
          <div className="multi-stop-metro-note" role="note">
            {tRouting('multiStopMetroUnavailable')}
          </div>
        )}

        <TravelModeSwitcher mode={travelMode} onModeChange={setTravelMode} />

        <div className="button-group">
          <button
            className="route-btn"
            onClick={() => void handleFindRoute()}
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <div className="spinner"></div>
                <span className="spinner-label">{tRouting('analyzing')}</span>
              </>
            ) : (
              tRouting('findRoute')
            )}
          </button>
          <button className="save-btn" onClick={handleSaveTrip} disabled={isCalculating || !startLocation || !destination}>
            {saveFlash ? tRouting('saved') : tRouting('save')}
          </button>
          {hasRoutingState && (
            <button
              className="reset-btn"
              onClick={handleReset}
              disabled={isCalculating}
              title={tRouting('clearRoute')}
              aria-label={tRouting('resetRoute')}
            >
              {tRouting('reset')}
            </button>
          )}
        </div>

        {error && (
          <div className="route-error" role="alert">
            <span>{error}</span>
            <span className="route-error-actions">
              {canRetry && (
                <button
                  type="button"
                  className="route-error-retry-btn"
                  onClick={() => { clearError(); retry(); }}
                >
                  {tErrors('retry')}
                </button>
              )}
              <button onClick={clearError} aria-label={tErrors('dismiss')}>×</button>
            </span>
          </div>
        )}

        <div className="separator" />

        {travelMode === 'metro' && transit.kind === 'ready' && (
          <>
            <TransitSummaryCard plan={transit.plan} />
            <div className="separator" />
          </>
        )}

        {travelMode === 'metro' && transit.kind === 'no-route' && (
          <>
            <div className="transit-no-route">
              <p>
                {tRouting('metro.noRoute', {
                  km: transit.nearestStationKm !== null
                    ? transit.nearestStationKm.toFixed(1)
                    : '—',
                })}
              </p>
              <button
                type="button"
                className="transit-switch-btn"
                onClick={() => setTravelMode('driving')}
              >
                {tRouting('metro.switchToDriving')}
              </button>
            </div>
            <div className="separator" />
          </>
        )}

        {routeInfo && travelMode !== 'metro' && (
          <>
            <RouteSummaryCard
              startLocation={startLocation}
              destination={destination}
              distance={routeInfo.distance}
              duration={routeInfo.duration}
              via={routeAlternatives[selectedRouteIndex]?.summary}
              label={ROUTE_LABEL_KEYS[selectedRouteIndex] ? tRouting(ROUTE_LABEL_KEYS[selectedRouteIndex]) : tRouting('routeOption', { n: selectedRouteIndex + 1 })}
              cameraCount={travelMode === 'driving' ? routeInfo.cameraCount : undefined}
            />
            <div className="route-actions">
              <button
                type="button"
                className="recenter-btn"
                onClick={() => setFitRouteSignal((n) => n + 1)}
                title={tRouting('recenterTitle')}
              >
                {tRouting('recenter')}
              </button>
              {(startCoords || startLocation) && (destCoords || destination) && (
                <a
                  className="handoff-btn"
                  href={buildGoogleMapsUrl(
                    startCoords ?? startLocation,
                    destCoords ?? destination,
                    travelMode,
                    waypointCoords.length > 0 ? waypointCoords : undefined,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={tRouting('openGoogleMapsTitle')}
                >
                  {tRouting('openGoogleMaps')}
                </a>
              )}
              <button
                type="button"
                className="share-btn"
                onClick={handleShareLink}
                title={tRouting('shareTitle')}
                disabled={!startCoords || !destCoords}
              >
                {shareFlash ? tRouting('copied') : tRouting('share')}
              </button>
            </div>
            <RouteAlternativesPanel
              alternatives={routeAlternatives}
              selectedIndex={selectedRouteIndex}
              onSelect={setSelectedRouteIndex}
            />
            {routeInfo.steps && routeInfo.steps.length > 0 && (
              <TurnByTurnPanel
                steps={routeInfo.steps}
                onStepClick={(loc) => setFlyToLocation([...loc])}
              />
            )}
            <div className="separator" />
          </>
        )}

        {insights && travelMode !== 'metro' && (
          <>
            <div className="insights-pane">
              <div className="insights-header">
                <span>🧠</span>
                <h3 className="insights-title">{tInsights('title')}</h3>
              </div>
              <p className="insights-text">
                {insights.delayMins > 0
                  ? tInsights('trafficAdding', { mins: insights.delayMins })
                  : tInsights('trafficLight')
                }
              </p>
            </div>
            <div className="separator" />
          </>
        )}

        {startCoords && destCoords && travelMode !== 'metro' && (
          <>
            <BestTimePanel
              startCoords={startCoords}
              endCoords={destCoords}
              travelMode={travelMode}
            />
            <div className="separator" />
          </>
        )}

        {(() => {
          const savedKeys = new Set(savedTrips.map((t) => `${t.start}→${t.dest}`));
          const visibleRecents = recents.filter((r) => !savedKeys.has(`${r.start}→${r.dest}`));
          if (visibleRecents.length === 0) return null;
          return (
            <div className="saved-trips-pane recent-trips-pane">
              <div className="recent-trips-header">
                <h3 className="saved-trips-title">{tTrips('recent')}</h3>
                <button
                  type="button"
                  className="recent-clear-btn"
                  onClick={clearRecents}
                  aria-label={tTrips('recentAriaLabel')}
                >
                  {tTrips('clearRecent')}
                </button>
              </div>
              {visibleRecents.map((trip) => (
                <div key={trip.id} className="trip-card trip-card--recent">
                  <button
                    className="trip-load-btn"
                    onClick={() => handleLoadTrip(trip)}
                    title={tTrips('loadTrip')}
                  >
                    <span>🕘</span>
                    <span>{trip.start} → {trip.dest}</span>
                  </button>
                </div>
              ))}
            </div>
          );
        })()}

        {savedTrips.length > 0 && (
          <div className="saved-trips-pane">
            <h3 className="saved-trips-title">{tTrips('savedTrips')}</h3>
            {savedTrips.map((trip) => (
              <div key={trip.id} className="trip-card">
                <button
                  className="trip-load-btn"
                  onClick={() => handleLoadTrip(trip)}
                  title={tTrips('loadTrip')}
                >
                  <span>📌</span>
                  <span>{trip.start} → {trip.dest}</span>
                </button>
                <button
                  className={`trip-delete-btn${pendingDeleteId === trip.id ? ' confirming' : ''}`}
                  onClick={() => {
                    if (pendingDeleteId === trip.id) {
                      deleteTrip(trip.id);
                      setPendingDeleteId(null);
                    } else {
                      setPendingDeleteId(trip.id);
                      setTimeout(() => setPendingDeleteId((prev) => prev === trip.id ? null : prev), 3000);
                    }
                  }}
                  title={pendingDeleteId === trip.id ? tTrips('confirmDelete') : tTrips('deleteTrip')}
                >
                  {pendingDeleteId === trip.id ? tTrips('confirmSure') : '✕'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryBar
        categories={categoryPills}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        activePlaceCount={places.length}
        nearMeActive={nearMeActive}
        nearMeStatus={nearMe.status}
        onNearMeToggle={handleNearMeToggle}
      />

      {(activeCategory || nearMeActive) && placesLoading && (
        <div className="category-skeleton-container" aria-busy="true" aria-label={tPlaces('loadingPlaces')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="category-skeleton-card">
              <div className="skeleton-shimmer skeleton-icon" />
              <div className="skeleton-shimmer skeleton-text" />
            </div>
          ))}
        </div>
      )}

      {(activeCategory || (nearMeActive && nearMe.coords)) && !places.length && !placesLoading && (
        <div className="category-empty-state" role="status" aria-live="polite">
          {activeCategory
            ? tPlaces('noPlaces', { category: activeCategory })
            : tPlaces('noPlacesNearby')}
        </div>
      )}

      {selectedPlace && (() => {
        let prayerWarning: PrayerWarning | null = null;
        if (
          nextPrayer
          && nextPrayer.minutesUntil <= PRAYER_WARNING_WINDOW_MINS
          && selectedPlace.category
          && PRAYER_CLOSURE_CATEGORIES.has(selectedPlace.category)
        ) {
          prayerWarning = {
            prayer: tPrayer(PRAYER_NAME_KEY[nextPrayer.name]),
            inMinutes: nextPrayer.minutesUntil,
          };
        }
        return (
          <PlaceCard
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onDirections={(placeName, coords) => {
              void handleFindRoute(placeName, coords);
              setSelectedPlace(null);
            }}
            prayerWarning={prayerWarning}
          />
        );
      })()}

      <button
        type="button"
        className={`traffic-toggle${trafficVisible ? ' active' : ''}`}
        onClick={() => setTrafficVisible((v) => !v)}
        title={trafficVisible ? 'Hide traffic layer' : 'Show traffic layer'}
        aria-label={trafficVisible ? 'Hide traffic' : 'Show traffic'}
        aria-pressed={trafficVisible}
      >
        🚦
      </button>

      <ErrorBoundary>
        <Map
          routeCoords={routeCoords}
          waypointCoords={waypointCoords}
          onRouteFetched={handleRouteFetched}
          onRouteAlternativesFetched={handleRouteAlternativesFetched}
          selectedRouteIndex={selectedRouteIndex}
          travelMode={travelMode}
          theme={theme}
          activeCategory={activeCategory}
          places={places}
          onPlaceClick={setSelectedPlace}
          flyToLocation={flyToLocation}
          userLocation={userLocation}
          fitRouteSignal={fitRouteSignal}
          onMapClick={handleMapClick}
          destPinCoords={destCoords}
          trafficVisible={trafficVisible}
          transitPlan={transit.kind === 'ready' ? transit.plan : null}
        />
      </ErrorBoundary>
    </main>
  )
}
