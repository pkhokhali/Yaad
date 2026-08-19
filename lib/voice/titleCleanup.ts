/** Strip time-of-day fragments left in titles after due time is parsed. */
export function stripTrailingTimeWords(title: string): string {
  return title
    .replace(/\bin the (morning|afternoon|evening|night)\b/giu, ' ')
    .replace(/\b(this )?(morning|afternoon|evening|night)\s*$/giu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Title-case each word after "Call " — "call mom" → "Call Mom". */
export function formatCallTargetTitle(title: string): string {
  const match = title.match(/^(\s*call\s+)(.+)$/iu);
  if (!match) return title;

  const target = match[2]
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      if (/^(dr|mr|mrs|ms)\.?$/iu.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');

  return `Call ${target}`;
}
