import { Category } from '@/types';

export const CARE_CATEGORIES: Category[] = [
  'general',
  'medicine',
  'buy',
  'doctor',
  'call',
];

export const CATEGORY_LABEL: Record<Category, string> = {
  medicine: 'Medicine',
  buy: 'Buy',
  doctor: 'Doctor',
  call: 'Call',
  general: 'Reminder',
  document: 'Reminder',
  repeat: 'Reminder',
};

export function categorySupportsPhoto(category: Category): boolean {
  return category === 'medicine';
}

export function normalizeCategory(value: string | null | undefined): Category {
  if (value === 'medicine' || value === 'buy' || value === 'doctor') {
    return value;
  }
  if (value === 'call') return 'call';
  return 'general';
}
