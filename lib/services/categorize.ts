import { Category } from '@/types';

const MEDICINE_PATTERNS =
  /(?:\b(medicine|medication|tablet|capsule|pill|dose|insulin|syrup|drops|take (my|the)?\s*(meds?|medicine|tablet|pill))\b|औषधि|ट्याब्लेट|खा(?:नु|ने)|दवाई)/iu;
const BUY_PATTERNS =
  /(?:\b(buy|purchase|refill|pharmacy|chemist|get (more|the)?\s*(meds?|medicine))\b|किन्|फार्मेसी|औषधि\s*किन्)/iu;
const DOCTOR_PATTERNS =
  /(?:\b(doctor|dr\.?|hospital|clinic|appointment|check[- ]?up|follow.?up|dentist|physician)\b|डाक्टर|अस्पताल|क्लिनिक|जाँच)/iu;
const CALL_PATTERNS =
  /(?:\b(call|phone|ring|dial|talk to|speak with)\b|कल\s*गर्|फोन\s*गर्|कुरा\s*गर्)/iu;

export function suggestCategory(text: string): Category {
  if (BUY_PATTERNS.test(text)) return 'buy';
  if (MEDICINE_PATTERNS.test(text)) return 'medicine';
  if (DOCTOR_PATTERNS.test(text)) return 'doctor';
  if (CALL_PATTERNS.test(text)) return 'call';
  return 'general';
}
