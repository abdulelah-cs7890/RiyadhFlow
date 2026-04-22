'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PlaceData } from '@/app/utils/mockData'
import { useLocale } from '@/app/i18n/LocaleProvider'
import { getLocalizedPlace } from '@/app/i18n/helpers'
import { CATEGORY_EMOJIS } from '../constants/categoryPills'

export interface PrayerWarning {
  prayer: string;
  inMinutes: number;
}

interface PlaceCardProps {
  place: PlaceData;
  onClose: () => void;
  onDirections: (placeName: string, coords: [number, number]) => void;
  prayerWarning?: PrayerWarning | null;
}

function PlaceCard({ place, onClose, onDirections, prayerWarning }: PlaceCardProps) {
  const t = useTranslations('places');
  const tPrayer = useTranslations('prayer');
  const { locale } = useLocale();
  const localizedPlace = getLocalizedPlace(place, locale);
  const [imageFailed, setImageFailed] = useState(false);

  const hasImage = Boolean(localizedPlace.image) && !imageFailed;
  const emoji = place.category ? CATEGORY_EMOJIS[place.category] : '📍';

  return (
    <div className="place-card">
      <button
        className="place-close"
        aria-label={t('closePlaceDetails')}
        onClick={onClose}
      >
        ✕
      </button>
      {hasImage ? (
        <Image
          src={localizedPlace.image as string}
          alt={localizedPlace.name}
          className="place-image"
          width={720}
          height={400}
          sizes="(max-width: 900px) 100vw, 360px"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="place-image-fallback" aria-hidden="true">
          <span className="place-image-fallback-emoji">{emoji}</span>
        </div>
      )}

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

        {prayerWarning && (
          <div className="prayer-warning" role="note">
            🕌 {tPrayer('mayClose', { prayer: prayerWarning.prayer, mins: prayerWarning.inMinutes })}
          </div>
        )}

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
