'use client'

import { memo } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Locate } from 'lucide-react'
import { Category } from '@/app/utils/mockData'
import { CategoryPill, getCategoryLabel } from '../constants/categoryPills'
import { useLocale } from '@/app/i18n/LocaleProvider'
import type { GeoStatus } from '@/app/hooks/useGeolocation'

interface CategoryBarProps {
  categories: CategoryPill[];
  activeCategory: Category | null;
  onCategoryChange: (category: Category | null) => void;
  activePlaceCount?: number;
  nearMeActive?: boolean;
  nearMeStatus?: GeoStatus;
  onNearMeToggle?: () => void;
}

function CategoryBar({
  categories,
  activeCategory,
  onCategoryChange,
  activePlaceCount,
  nearMeActive = false,
  nearMeStatus = 'idle',
  onNearMeToggle,
}: CategoryBarProps) {
  const t = useTranslations('categories');
  const tPlaces = useTranslations('places');
  const { locale } = useLocale();

  const nearMeLabel =
    nearMeStatus === 'loading' ? tPlaces('nearMeLoading')
    : nearMeStatus === 'error' ? tPlaces('nearMeError')
    : tPlaces('nearMe');

  return (
    <div className="category-bar-container">
      {onNearMeToggle && (
        <button
          type="button"
          className={`category-pill category-pill--nearme${nearMeActive ? ' active' : ''}`}
          aria-pressed={nearMeActive}
          onClick={onNearMeToggle}
          disabled={nearMeStatus === 'loading'}
        >
          {nearMeStatus === 'loading'
            ? <Loader2 size={14} aria-hidden strokeWidth={2} className="lucide-spin" />
            : <Locate size={14} aria-hidden strokeWidth={2} />}
          <span>{nearMeLabel}</span>
        </button>
      )}
      {categories.map((category) => {
        const isAll = category.label === 'All';
        const isActive = isAll ? activeCategory === null : activeCategory === category.label;
        const displayLabel = isAll ? t('all') : getCategoryLabel(category.label as Category, locale);
        const Icon = category.Icon;

        return (
          <button
            key={category.label}
            type="button"
            className={`category-pill${isActive ? ' active' : ''}`}
            aria-pressed={isActive}
            aria-label={t('filter', { category: displayLabel })}
            onClick={() => {
              const nextCategory = isAll ? null : (isActive ? null : category.label as Category);
              onCategoryChange(nextCategory);
            }}
          >
            {Icon && <Icon size={14} aria-hidden strokeWidth={2} />}
            <span>{displayLabel}</span>
            {isActive && !isAll && activePlaceCount != null && activePlaceCount > 0 && (
              <span className="category-pill-count">{activePlaceCount}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default memo(CategoryBar);
