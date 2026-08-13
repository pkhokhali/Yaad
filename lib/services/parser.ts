import * as chrono from 'chrono-node';

import { suggestCategory } from '@/lib/services/categorize';
import { listRecentReminders } from '@/lib/db/reminders';
import { ParsedCapture, Reminder } from '@/types';

const PREFIX =
  /^(remind me to|remind me|remember to|don't forget to|dont forget to|yaad|याद)\s+/i;

function cleanTitle(text: string, dueAt: Date): string {
  let title = text.replace(PREFIX, '').trim();

  // Strip common temporal phrases chrono already consumed
  title = title
    .replace(
      /\b(today|tomorrow|tonight|this (morning|afternoon|evening|week)|next (week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|at \d{1,2}(:\d{2})?\s*(am|pm)?|in \d+\s*(minutes?|hours?|days?)|on \w+day)\b/gi,
      '',
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();

  if (!title) {
    title = text.replace(PREFIX, '').trim() || 'Reminder';
  }

  // Silence unused param warning while keeping signature for future refinement
  void dueAt;
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function defaultDueAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

function scoreOverlap(a: string, b: string): number {
  const tokensA = new Set(
    a
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 2),
  );
  const tokensB = b
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
  if (tokensA.size === 0 || tokensB.length === 0) return 0;
  let hits = 0;
  for (const t of tokensB) {
    if (tokensA.has(t)) hits += 1;
  }
  return hits / Math.max(tokensA.size, 1);
}

/** Lightweight on-device reference resolution against recent history. */
export async function resolveReference(
  text: string,
): Promise<Reminder | null> {
  const ref =
    /\b(the .+? thing|that .+|the same .+|again)\b/i.exec(text)?.[0] ??
    null;
  if (!ref && !/\bagain\b/i.test(text)) return null;

  const recent = await listRecentReminders(40);
  let best: Reminder | null = null;
  let bestScore = 0.25;

  for (const r of recent) {
    const score = scoreOverlap(r.title, text);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

export async function parseCaptureText(
  rawText: string,
): Promise<ParsedCapture> {
  const text = rawText.trim();
  const results = chrono.parse(text, new Date(), { forwardDate: true });
  const dueAt = results[0]?.start?.date() ?? defaultDueAt();

  let title = cleanTitle(text, dueAt);
  const referenced = await resolveReference(text);
  if (referenced && /\b(again|same|that|the .+ thing)\b/i.test(text)) {
    title = referenced.title;
  }

  return {
    title,
    dueAt,
    category: suggestCategory(text) || referenced?.category || 'general',
    rawText: text,
  };
}
