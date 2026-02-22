const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "be", "was", "are",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "this", "that", "these", "those", "not", "no", "nor", "so", "if",
  "then", "than", "too", "very", "just", "about", "above", "after",
  "again", "all", "also", "any", "because", "before", "between", "both",
  "each", "few", "get", "got", "here", "how", "into", "its", "let",
  "more", "most", "new", "now", "only", "other", "our", "out", "over",
  "own", "same", "she", "some", "such", "them", "there", "they", "through",
  "under", "until", "use", "used", "using", "what", "when", "where",
  "which", "while", "who", "why", "you", "your",
]);

/** Tokenize text into a set of significant lowercase words. */
export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
  return new Set(words);
}

/**
 * Score how similar two texts are based on keyword overlap.
 * Returns a ratio from 0 to 1 (intersection / smaller set size).
 */
export function overlapScore(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const word of smaller) {
    if (larger.has(word)) overlap++;
  }
  return overlap / smaller.size;
}
