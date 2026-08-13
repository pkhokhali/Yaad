import { Category } from '@/types';

export const colors = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  borderHairline: '#ECEEF2',
  text: '#1A1D21',
  textMuted: '#6B7280',
  textSubtle: '#9CA3AF',
  accent: '#C45C26',
  accentSoft: '#FDF0E9',
  danger: '#DC2626',
  success: '#059669',
  streak: '#EA580C',
  overlay: 'rgba(26, 29, 33, 0.4)',
};

export const categoryColors: Record<
  Category,
  { tint: string; soft: string; icon: string }
> = {
  call: { tint: '#2563EB', soft: '#EFF6FF', icon: 'call' },
  document: { tint: '#0F766E', soft: '#F0FDFA', icon: 'document-text' },
  repeat: { tint: '#D97706', soft: '#FFFBEB', icon: 'refresh' },
  general: { tint: '#64748B', soft: '#F8FAFC', icon: 'bookmark' },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radii = {
  chip: 10,
  card: 16,
  pill: 24,
  input: 22,
};
