export type VoiceReplyIntent = 'done' | 'snooze' | 'call' | null;

const DONE =
  /^(done|complete|completed|ok|okay|yes|got it|mark done|finished|भयो|सकियो|गरें|गरेँ|हो|ठिक|लुमंके)$/iu;
const SNOOZE =
  /^(snooze|later|wait|remind later|not now|10|30|60|पछि|अलि पछि|पछि गर|माथि)$/iu;
const CALL = /^(call|phone|dial|ring|कल|फोन|फोन गर|कल गर)$/iu;

/** Parse a lock-screen voice/text reply into Done / Snooze / Call. */
export function parseVoiceReply(raw: string): VoiceReplyIntent {
  const text = raw.trim().replace(/[.!?]+$/g, '');
  if (!text) return null;
  if (DONE.test(text) || /\b(done|भयो|सकियो)\b/iu.test(text)) return 'done';
  if (SNOOZE.test(text) || /\b(snooze|later|पछि)\b/iu.test(text)) return 'snooze';
  if (CALL.test(text) || /\b(call|कल|फोन)\b/iu.test(text)) return 'call';
  return null;
}

export function extractPhone(text: string): string | null {
  const match = text.match(/(\+?\d[\d\s\-()]{6,}\d)/);
  if (!match) return null;
  const digits = match[1].replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : null;
}
