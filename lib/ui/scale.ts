export type ScaleMode = 'standard' | 'comfort';

export type ScaleTokens = {
  heroTime: number;
  heroTitle: number;
  heroLabel: number;
  heroBtn: number;
  heroBtnPad: number;
  heroPhoto: number;
  cardPad: number;
  gap: number;
  radius: number;
  minHitTarget: number;
  showFullLater: boolean;
  body: number;
  meta: number;
};

export const SCALE_STANDARD: ScaleTokens = {
  heroTime: 22,
  heroTitle: 18,
  heroLabel: 11,
  heroBtn: 16,
  heroBtnPad: 14,
  heroPhoto: 64,
  cardPad: 12,
  gap: 10,
  radius: 16,
  minHitTarget: 44,
  showFullLater: true,
  body: 16,
  meta: 13,
};

export const SCALE_COMFORT: ScaleTokens = {
  heroTime: 32,
  heroTitle: 24,
  heroLabel: 14,
  heroBtn: 20,
  heroBtnPad: 20,
  heroPhoto: 88,
  cardPad: 18,
  gap: 16,
  radius: 20,
  minHitTarget: 56,
  showFullLater: false,
  body: 18,
  meta: 15,
};

export function tokensFor(mode: ScaleMode): ScaleTokens {
  return mode === 'comfort' ? SCALE_COMFORT : SCALE_STANDARD;
}
