import { Category } from '@/types';

const CALL_PATTERNS =
  /(?:\b(call|phone|ring|dial|talk to|speak with|follow.?up with|distributor|doctor|dr\.?)\b|कल\s*गर्|फोन\s*गर्|कुरा\s*गर्|डाक्टर)/iu;
const DOCUMENT_PATTERNS =
  /(?:\b(report|document|submit|file|form|invoice|send|email|write|draft|ppt|presentation|excel)\b|रिपोर्ट|कागजात|फारम|पठाउ|इमेल)/iu;
const REPEAT_PATTERNS =
  /(?:\b(every day|daily|weekly|each week|recurring|again|routine|after (the )?visit|every monday|every morning)\b|हरेक\s*दिन|दैनिक|साप्ताहिक|फेरि|न्हिनं|लिसे)/iu;

export function suggestCategory(text: string): Category {
  if (REPEAT_PATTERNS.test(text)) return 'repeat';
  if (CALL_PATTERNS.test(text)) return 'call';
  if (DOCUMENT_PATTERNS.test(text)) return 'document';
  return 'general';
}
