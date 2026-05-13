import {
  Dumbbell,
  Fuel,
  Hotel,
  Landmark,
  ParkingSquare,
  Pill,
  ShoppingBag,
  Sparkles,
  Star,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_LABELS, Category } from '@/app/utils/mockData'

export type CategoryPill = { label: 'All' | Category; Icon?: LucideIcon };

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  'Restaurants': UtensilsCrossed,
  'Hotels': Hotel,
  'Things to do': Sparkles,
  'Museums': Landmark,
  'Transit': TrainFront,
  'Pharmacies': Pill,
  'Gyms': Dumbbell,
  'Mosques': Star,
  'Parking': ParkingSquare,
  'Gas Stations': Fuel,
  'Malls': ShoppingBag,
};

export const CATEGORY_LABELS_AR: Record<Category, string> = {
  'Restaurants': 'مطاعم',
  'Hotels': 'فنادق',
  'Things to do': 'أنشطة',
  'Museums': 'متاحف',
  'Transit': 'مواصلات',
  'Pharmacies': 'صيدليات',
  'Gyms': 'نوادي',
  'Mosques': 'مساجد',
  'Parking': 'مواقف',
  'Gas Stations': 'محطات وقود',
  'Malls': 'مولات',
};

export const getCategoryLabel = (cat: Category | 'All', locale: 'en' | 'ar'): string => {
  if (cat === 'All') return locale === 'ar' ? 'الكل' : 'All';
  return locale === 'ar' ? CATEGORY_LABELS_AR[cat] : cat;
};

export const categoryPills: CategoryPill[] = [
  { label: 'All' },
  ...CATEGORY_LABELS.map((label) => ({ label, Icon: CATEGORY_ICONS[label] })),
];
