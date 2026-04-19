'use client'

import { memo } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PlaceData } from '@/app/utils/mockData'
import { useLocale } from '@/app/i18n/LocaleProvider'
import { getLocalizedPlace } from '@/app/i18n/helpers'

const FALLBACK_PLACE_IMAGE = 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?w=800&q=80';

interface PlaceCardProps {
  place: PlaceData;
  onClose: () => void;
  onDirections: (placeName: string, coords: [number, number]) => void;
}

function PlaceCard({ place, onClose, onDirections }: PlaceCardProps) {
  const t = useTranslations('places');
  const { locale } = useLocale();
  const localizedPlace = getLocalizedPlace(place, locale);

  return (
    <div className="place-card">
      <button
        className="place-close"
        aria-label={t('closePlaceDetails')}
        onClick={onClose}
      >
        ✕
      </button>
      <Image
        src={localizedPlace.image ?? FALLBACK_PLACE_IMAGE}
        alt={localizedPlace.name}
        className="place-image"
        width={720}
        height={400}
        sizes="(max-width: 900px) 100vw, 360px"
        onError={(event) => {
          const image = event.currentTarget as HTMLImageElement;
          image.onerror = null;
          image.src = FALLBACK_PLACE_IMAGE;
        }}
      />

      <div className="place-content">
        <h2 className="place-title">{localizedPlace.name}</h2>

        {localizedPlace.rating != null && localizedPlace.reviews != null && (
          <div className="place-rating">
            <span className="star">★</span>
            <strong>{localizedPlace.rating}</strong>
            <span>{t('reviews', { count: localizedPlace.reviews.toLocaleString() })}</span>
          </div>
        )}
        <div className="place-type">{localizedPlace.type} - {localizedPlace.address}</div>

        {localizedPlace.distance_m != null && (
          <div className="place-distance" aria-label={t('distanceFromYou')}>
            <span aria-hidden="true">📍</span>
            <span>{t('km', { km: (localizedPlace.distance_m / 1000).toFixed(localizedPlace.distance_m < 1000 ? 2 : 1) })}</span>
          </div>
        )}

        {localizedPlace.about && <p className="place-about">{localizedPlace.about}</p>}

        <button
          className="go-btn"
          onClick={() => onDirections(localizedPlace.name, localizedPlace.coords)}
        >
          {t('directions')}
        </button>
      </div>
    </div>
  );
}

export default memo(PlaceCard);
