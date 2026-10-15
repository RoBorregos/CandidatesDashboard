// Fuzzy name matching for the robot assistant, where names arrive through
// speech-to-text. Transcription errors are character- and sound-level
// ("Rosalez", "Bembenuto"), so names are compared on a light Spanish phonetic
// fold rather than by whole tokens.

// Particles that appear in many surnames and would otherwise match for free.
const PARTICLES = new Set(["de", "del", "la", "las", "los", "y"]);

/** Lowercase, strip accents and anything that isn't a letter or digit. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Speech-to-text writes small numbers either way ("equipo tres", "team 3").
const NUMBER_WORDS = new Map<string, string>(
  [
    "cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciseis diecisiete dieciocho diecinueve veinte",
    "zero one two three four five six seven eight nine ten",
  ].flatMap((list) =>
    list.split(" ").map((word, n): [string, string] => [word, String(n)]),
  ),
);

function tokens(normalized: string): string[] {
  return normalized
    .split(" ")
    .filter((t) => t && !PARTICLES.has(t))
    .map((t) => NUMBER_WORDS.get(t) ?? t);
}

/** Folds letters that sound the same in Spanish, so STT spellings agree. */
export function phonetic(token: string): string {
  return token
    .replace(/ch/g, "1") // keep "ch" through the silent-h step
    .replace(/h/g, "")
    .replace(/1/g, "ch")
    .replace(/ll/g, "y")
    .replace(/g([ei])/g, "j$1")
    .replace(/gu([ei])/g, "g$1")
    .replace(/qu([ei])/g, "k$1")
    .replace(/c([ei])/g, "s$1")
    .replace(/c(?!h)/g, "k")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/x/g, "j")
    .replace(/y$/, "i")
    .replace(/(.)\1+/g, "$1");
}

function levenshtein(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  return len === 0 ? 1 : 1 - levenshtein(a, b) / len;
}

function trigrams(s: string): string[] {
  const padded = `  ${s} `;
  const grams: string[] = [];
  for (let i = 0; i < padded.length - 2; i++)
    grams.push(padded.slice(i, i + 3));
  return grams;
}

/** Sørensen–Dice over character trigrams. */
function dice(a: string, b: string): number {
  const ga = trigrams(a);
  const gb = trigrams(b);
  const counts = new Map<string, number>();
  for (const g of gb) counts.set(g, (counts.get(g) ?? 0) + 1);
  let shared = 0;
  for (const g of ga) {
    const n = counts.get(g) ?? 0;
    if (n > 0) {
      shared++;
      counts.set(g, n - 1);
    }
  }
  return (2 * shared) / (ga.length + gb.length);
}

/**
 * How well a spoken query matches a full name, 0..1. Takes the better of
 * per-token alignment (partial names, word order) and whole-string trigram
 * overlap (words split or merged by the transcription).
 */
export function scoreName(query: string, name: string): number {
  const q = tokens(normalize(query)).map(phonetic);
  const n = tokens(normalize(name)).map(phonetic);
  if (q.length === 0 || n.length === 0) return 0;

  const aligned =
    q.reduce(
      (sum, qt) => sum + Math.max(...n.map((nt) => similarity(qt, nt))),
      0,
    ) / q.length;
  const overlap = dice(q.join(""), n.join(""));
  return Math.max(aligned, overlap);
}

/** Every query token appears, accents aside, as a token of the name. */
export function containsAllTokens(query: string, name: string): boolean {
  const q = tokens(normalize(query));
  const n = new Set(tokens(normalize(name)));
  return q.length > 0 && q.every((t) => n.has(t));
}

export type NameMatch<T> = T & { score: number };

/**
 * Ranks candidates against a spoken name. `exact` is set only when the query
 * names exactly one candidate unambiguously; otherwise `matches` holds the
 * `limit` closest names for the person to pick from.
 */
export function rankNames<T extends { name: string }>(
  query: string,
  candidates: T[],
  limit: number,
): { exact: boolean; matches: NameMatch<T>[] } {
  const contained = candidates.filter((c) => containsAllTokens(query, c.name));
  if (contained.length === 1) {
    return { exact: true, matches: [{ ...contained[0]!, score: 1 }] };
  }

  const matches = candidates
    .map((c) => ({
      ...c,
      score: Math.round(scoreName(query, c.name) * 100) / 100,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
  return { exact: false, matches };
}
