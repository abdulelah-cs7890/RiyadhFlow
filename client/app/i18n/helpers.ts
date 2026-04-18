import { Category, PlaceData } from '@/app/utils/mockData';

export const CATEGORY_LABELS_AR: Record<Category, string> = {
  'Restaurants': 'مطاعم',
  'Hotels': 'فنادق',
  'Things to do': 'أنشطة',
  'Museums': 'متاحف',
  'Transit': 'مواصلات',
  'Pharmacies': 'صيدليات',
  'Gyms': 'نوادي',
};

export const getCategoryLabel = (cat: Category | 'All', locale: 'en' | 'ar'): string => {
  if (cat === 'All') return locale === 'ar' ? 'الكل' : 'All';
  return locale === 'ar' ? CATEGORY_LABELS_AR[cat] : cat;
};

export function getLocalizedPlace(p: PlaceData, locale: 'en' | 'ar'): PlaceData {
  if (locale === 'en') return p;
  return {
    ...p,
    name: p.name_ar ?? p.name,
    address: p.address_ar ?? p.address,
    about: p.about_ar ?? p.about,
    type: p.type_ar ?? p.type,
  };
}
