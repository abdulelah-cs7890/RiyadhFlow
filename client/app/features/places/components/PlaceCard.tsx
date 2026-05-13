'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Globe, MapPin, Navigation, Phone, Star, X } from 'lucide-react'
import { PlaceData } from '@/app/utils/mockData'
import { useLocale } from '@/app/i18n/LocaleProvider'
import { getLocalizedPlace } from '@/app/i18n/helpers'
import { CATEGORY_ICONS } from '../constants/categoryPills'

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
  const FallbackIcon = place.category ? CATEGORY_ICONS[place.category] : MapPin;

  return (
    <div className="place-card">
      <button
        className="place-close"
        aria-label={t('closePlaceDetails')}
        onClick={onClose}
      >
        <X size={16} aria-hidden strokeWidth={2.5} />
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
          <FallbackIcon size={48} strokeWidth={1.5} className="place-image-fallback-icon" />
        </div>
      )}

      <div className="place-content">
        <h2 className="place-title">{localizedPlace.name}</h2>

        {localizedPlace.rating != null && localizedPlace.reviews != null && (
          <div className="place-rating">
            <Star size={14} className="place-rating-star" aria-hidden strokeWidth={2} />
            <strong>{localizedPlace.rating}</strong>
            <span>{t('reviews', { count: localizedPlace.reviews.toLocaleString() })}</span>
          </div>
        )}
        <div className="place-type">{localizedPlace.type} - {localizedPlace.address}</div>

        {localizedPlace.distance_m != null && (
          <div className="place-distance" aria-label={t('distanceFromYou')}>
            <MapPin size={13} aria-hidden strokeWidth={2} />
            <span>{t('km', { km: (localizedPlace.distance_m / 1000).toFixed(localizedPlace.distance_m < 1000 ? 2 : 1) })}</span>
          </div>
        )}

        {localizedPlace.about && <p className="place-about">{localizedPlace.about}</p>}

        {prayerWarning && (
          <div className="prayer-warning" role="note">
            {tPrayer('mayClose', { prayer: prayerWarning.prayer, mins: prayerWarning.inMinutes })}
          </div>
        )}

        {(place.phone || place.website) && (
          <div className="place-quick-actions">
            {place.phone && (
              <a
                className="place-quick-action"
                href={`tel:${place.phone}`}
                aria-label={t('callAction', { phone: place.phone })}
              >
                <Phone size={14} aria-hidden strokeWidth={2} />
                <span>{t('call')}</span>
              </a>
            )}
            {place.website && (
              <a
                className="place-quick-action"
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('websiteAction')}
              >
                <Globe size={14} aria-hidden strokeWidth={2} />
                <span>{t('website')}</span>
              </a>
            )}
          </div>
        )}

        <button
          className="go-btn"
          onClick={() => onDirections(localizedPlace.name, localizedPlace.coords)}
        >
          <Navigation size={15} aria-hidden strokeWidth={2.25} />
          <span>{t('directions')}</span>
        </button>
      </div>
    </div>
  );
}

export default memo(PlaceCard);
