import { Category } from '@/types';

const CALL_PATTERNS =
  /\b(call|phone|ring|dial|talk to|speak with|follow.?up with|distributor|doctor|dr\.?)\b/i;
const DOCUMENT_PATTERNS =
  /\b(report|document|submit|file|form|invoice|send|email|write|draft|ppt|presentation|excel)\b/i;
const REPEAT_PATTERNS =
  /\b(every day|daily|weekly|each week|recurring|again|routine|after (the )?visit|every monday|every morning)\b/i;

export function suggestCategory(text: string): Category {
  if (REPEAT_PATTERNS.test(text)) return 'repeat';
  if (CALL_PATTERNS.test(text)) return 'call';
  if (DOCUMENT_PATTERNS.test(text)) return 'document';
  return 'general';
}
