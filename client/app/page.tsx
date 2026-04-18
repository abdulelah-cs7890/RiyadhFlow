'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Map from './components/Map'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PlaceData } from './utils/mockData'
import { useRoutePlanner } from './features/routing/hooks/useRoutePlanner'
import { useUrlSyncedRouteState } from './features/routing/hooks/useUrlSyncedRouteState'
import { useSavedTrips } from './features/trips/hooks/useSavedTrips'
import { usePlaces } from './features/places/hooks/usePlaces'
import CategoryBar from './features/places/components/CategoryBar'
import PlaceCard from './features/places/components/PlaceCard'
import { categoryPills } from './features/places/constants/categoryPills'
import { RouteAlternative } from './features/routing/types'
import RouteAlternativesPanel from './features/routing/components/RouteAlternativesPanel'
import RouteSummaryCard from './features/routing/components/RouteSummaryCard'
import TravelModeSwitcher from './features/routing/components/TravelModeSwitcher'
import ThemeToggle from './features/theme/components/ThemeToggle'
import { useTheme } from './features/theme/hooks/useTheme'
import AutocompleteInput from './features/routing/components/AutocompleteInput'
import TurnByTurnPanel from './features/routing/components/TurnByTurnPanel'
import { ROUTE_LABEL_KEYS } from './features/routing/types'
import { buildGoogleMapsUrl } from './features/routing/utils/deeplinks'
import { parseUrlRouteState, buildUrlWithRouteState } from './features/routing/utils/urlState'
import LanguageToggle from './components/LanguageToggle'

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
  } = useUrlSyncedRouteState();
  const { theme, toggleTheme } = useTheme();
  const { trips: savedTrips, saveTrip, deleteTrip } = useSavedTrips();
  const {
    routeCoords,
    routeInfo,
    insights,
    isCalculating,
    error,
    findRoute,
    handleRouteFetched,
    resetRoute,
    clearError,
  } = useRoutePlanner();
  const { places, isLoading: placesLoading } = usePlaces(activeCategory);

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
    });
  }, [destination, destCoords, findRoute, startCoords, startLocation, setDestination]);

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
    setRouteAlternatives([]);
    setSelectedRouteIndex(0);
    setFlyToLocation(null);
    setUserLocation(null);
    setSelectedPlace(null);
  }, [resetRoute, setStartLocation, setDestination]);

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

  return (
    <main className="app-container">
      <div className="glass-pane">
        <div className="glass-pane-header">
          <h2 className="title">
            {tUi('appTitle')}
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <LanguageToggle />
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </span>
          </h2>
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

          <AutocompleteInput
            value={destination}
            onChange={(v) => { setDestination(v); setDestCoords(null); }}
            onSelect={(name, coords) => { setDestination(name); setDestCoords(coords); }}
            placeholder={tRouting('destinationPlaceholder')}
            label={tRouting('destinationLabel')}
            icon="📍"
            onSubmit={() => void handleFindRoute()}
          />
        </div>

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
            <button onClick={clearError} aria-label={tErrors('dismiss')}>×</button>
          </div>
        )}

        <div className="separator" />

        {routeInfo && (
          <>
            <RouteSummaryCard
              startLocation={startLocation}
              destination={destination}
              distance={routeInfo.distance}
              duration={routeInfo.duration}
              via={routeAlternatives[selectedRouteIndex]?.summary}
              label={ROUTE_LABEL_KEYS[selectedRouteIndex] ? tRouting(ROUTE_LABEL_KEYS[selectedRouteIndex]) : tRouting('routeOption', { n: selectedRouteIndex + 1 })}
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

        {insights && (
          <>
            <div className="insights-pane">
              <div className="insights-header">
                <span>🧠</span>
                <h3 className="insights-title">{tInsights('title')}</h3>
              </div>
              <p className="insights-text">
                {insights.savedMins > 0
                  ? tInsights('trafficAdding', { mins: insights.savedMins, bestTime: insights.bestTime })
                  : tInsights('trafficLight')
                }
              </p>
            </div>
            <div className="separator" />
          </>
        )}

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
      />

      {activeCategory && placesLoading && (
        <div className="category-skeleton-container" aria-busy="true" aria-label={tPlaces('loadingPlaces')}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="category-skeleton-card">
              <div className="skeleton-shimmer skeleton-icon" />
              <div className="skeleton-shimmer skeleton-text" />
            </div>
          ))}
        </div>
      )}

      {activeCategory && !places.length && !placesLoading && (
        <div className="category-empty-state" role="status" aria-live="polite">
          {tPlaces('noPlaces', { category: activeCategory })}
        </div>
      )}

      {selectedPlace && (
        <PlaceCard
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onDirections={(placeName, coords) => {
            void handleFindRoute(placeName, coords);
            setSelectedPlace(null);
          }}
        />
      )}

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
        />
      </ErrorBoundary>
    </main>
  )
}
