import { Category } from '@/types';

export const CARE_CATEGORIES: Category[] = [
  'medicine',
  'buy',
  'doctor',
  'call',
  'general',
];

export const CATEGORY_LABEL: Record<Category, string> = {
  medicine: 'Medicine',
  buy: 'Buy',
  doctor: 'Doctor',
  call: 'Call',
  general: 'Other',
  document: 'Other',
  repeat: 'Other',
};

export function normalizeCategory(value: string | null | undefined): Category {
  if (value === 'medicine' || value === 'buy' || value === 'doctor') {
    return value;
  }
  if (value === 'call') return 'call';
  return 'general';
}
