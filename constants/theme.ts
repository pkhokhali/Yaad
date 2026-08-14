import { Category } from '@/types';

/** Material 3 Dark + Electric Amber Memory Node identity */
export const colors = {
  background: '#12141A',
  surface: '#1C1F27',
  surfaceElevated: '#252932',
  border: '#2E3340',
  borderHairline: '#23262E',
  text: '#F3F4F6',
  textMuted: '#9CA3AF',
  textSubtle: '#6B7280',
  accent: '#FFB300',
  accentSoft: 'rgba(255, 179, 0, 0.14)',
  accentGlow: 'rgba(255, 179, 0, 0.35)',
  accentBlue: '#5EB8FF',
  danger: '#F87171',
  success: '#34D399',
  streak: '#FFB300',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

export const categoryColors: Record<
  Category,
  { tint: string; soft: string; icon: string }
> = {
  call: { tint: '#5EB8FF', soft: 'rgba(94, 184, 255, 0.12)', icon: 'call' },
  document: { tint: '#34D399', soft: 'rgba(52, 211, 153, 0.12)', icon: 'document-text' },
  repeat: { tint: '#FFB300', soft: 'rgba(255, 179, 0, 0.12)', icon: 'refresh' },
  general: { tint: '#9CA3AF', soft: 'rgba(156, 163, 175, 0.12)', icon: 'bookmark' },
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
  fab: 18,
};

export const brand = {
  motto: 'Don\u2019t remember. Just Yaad.',
  tagline: 'Everything lives on your phone alone.',
  voiceTagline: 'Voice-first. 100% On-Device.',
};
