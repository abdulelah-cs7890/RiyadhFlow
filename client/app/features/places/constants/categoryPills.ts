import { CATEGORY_LABELS, Category } from '@/app/utils/mockData'

export type CategoryPill = { label: 'All' | Category; emoji?: string };

export const CATEGORY_EMOJIS: Record<Category, string> = {
  'Restaurants': '🍽️',
  'Hotels': '🏨',
  'Things to do': '🎡',
  'Museums': '🏛️',
  'Transit': '🚇',
  'Pharmacies': '💊',
  'Gyms': '🏋️',
};

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

export const categoryPills: CategoryPill[] = [
  { label: 'All' },
  ...CATEGORY_LABELS.map((label) => ({ label, emoji: CATEGORY_EMOJIS[label] })),
];
