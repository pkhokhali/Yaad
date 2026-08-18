import { Category } from '@/types';

export type ThemeName = 'dark' | 'normal';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderHairline: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentBlue: string;
  navActive: string;
  primaryButton: string;
  danger: string;
  success: string;
  streak: string;
  overlay: string;
};

/** Material 3 Dark + Electric Amber Memory Node identity */
export const darkColors: ThemeColors = {
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
  accentBlue: '#2563EB',
  navActive: '#2563EB',
  primaryButton: '#6D28D9',
  danger: '#F87171',
  success: '#34D399',
  streak: '#FFB300',
  overlay: 'rgba(0, 0, 0, 0.62)',
};

/** Normal = FieldOps-style light dashboard. */
export const lightColors: ThemeColors = {
  background: '#F4F6FB',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF2FF',
  border: '#E2E8F0',
  borderHairline: '#E8ECF4',
  text: '#0F172A',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
  accent: '#FFB300',
  accentSoft: 'rgba(255, 179, 0, 0.14)',
  accentGlow: 'rgba(255, 179, 0, 0.28)',
  accentBlue: '#2563EB',
  navActive: '#2563EB',
  primaryButton: '#6D28D9',
  danger: '#EF4444',
  success: '#16A34A',
  streak: '#FFB300',
  overlay: 'rgba(15, 23, 42, 0.45)',
};

/** @deprecated Use useTheme().colors — kept as dark default for non-UI modules. */
export const colors = darkColors;

export const categoryColors: Record<
  Category,
  { tint: string; soft: string; icon: string }
> = {
  medicine: { tint: '#34D399', soft: 'rgba(52, 211, 153, 0.14)', icon: 'medkit' },
  buy: { tint: '#FBBF24', soft: 'rgba(251, 191, 36, 0.14)', icon: 'cart' },
  doctor: { tint: '#A78BFA', soft: 'rgba(167, 139, 250, 0.14)', icon: 'medkit-outline' },
  call: { tint: '#5EB8FF', soft: 'rgba(94, 184, 255, 0.12)', icon: 'call' },
  general: { tint: '#9CA3AF', soft: 'rgba(156, 163, 175, 0.12)', icon: 'bookmark' },
  document: { tint: '#9CA3AF', soft: 'rgba(156, 163, 175, 0.12)', icon: 'document-text' },
  repeat: { tint: '#FFB300', soft: 'rgba(255, 179, 0, 0.12)', icon: 'refresh' },
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
  mottoNe: 'नबिर्सनुहोस्। याद मात्र।',
  /** Devanagari + Newari script names shown on splash. */
  localNames: 'याद · लुमं',
  tagline: 'Everything lives on your phone alone.',
  taglineNe: 'सबै कुरा यसै फोनमा मात्र रहन्छ।',
  voiceTagline: 'Voice-first. 100% on-device.',
  voiceTaglineNe: 'आवाजबाट। पूर्ण रूपमा फोनमै।',
};

export function paletteFor(theme: ThemeName): ThemeColors {
  return theme === 'normal' ? lightColors : darkColors;
}
