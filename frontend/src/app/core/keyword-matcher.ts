import { MasterVault } from './vault.model';

const STOPWORDS = new Set(
  (
    'a an and are as at be by for from has have in is it its of on or our that the their this to we will with you your ' +
    'about all also any can more other such than them they who work working team teams experience years year strong ' +
    'ability skills knowledge etc including new role job company join looking responsibilities requirements ' +
    'candidate position must should would good great well using use used '
  ).split(/\s+/),
);

export function normalize(s: string): string {
  return s.toLowerCase().normalize('NFC');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if `text` contains keyword `kw` as a whole token (prefix-stemmed for long words, to tolerate plurals/inflection). */
export function textHasKeyword(text: string, kw: string): boolean {
  const t = normalize(text);
  const k = normalize(kw).trim();
  if (!k) return false;
  const isWord = /^\p{L}{7,}$/u.test(k);
  const body = escapeRegex(isWord ? k.slice(0, k.length - 2) : k);
  const tail = isWord ? '' : '(?![\\p{L}\\p{N}])';
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}${tail}`, 'u').test(t);
}

export function vaultText(vault: MasterVault): string {
  return [
    vault.summary,
    vault.skills.join(' '),
    ...vault.experience.flatMap((e) => [e.role, e.company, ...e.bullets.map((b) => b.text)]),
    ...vault.education.map((e) => `${e.degree} ${e.institution}`),
  ].join('\n');
}

/** Heuristic keyword extraction: known vault skills first, then frequent/tech-like job-description tokens. */
export function extractKeywords(jd: string, vault: MasterVault, limit = 20): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const add = (k: string) => {
    const n = normalize(k);
    if (!seen.has(n)) {
      seen.add(n);
      found.push(k);
    }
  };

  vault.skills.filter((s) => textHasKeyword(jd, s)).forEach(add);

  const tokens = jd.match(/[\p{L}\p{N}][\p{L}\p{N}+#.\-/]*[\p{L}\p{N}+#]|[\p{L}\p{N}]/gu) ?? [];
  const freq = new Map<string, { count: number; display: string; techLike: boolean }>();
  for (const tok of tokens) {
    const n = normalize(tok);
    if (n.length < 2 || STOPWORDS.has(n) || /^\d+$/.test(n)) continue;
    const techLike = /[+#.]|\d/.test(tok) || /^[A-Z]{2,}$/.test(tok) || /[a-z][A-Z]/.test(tok);
    const cur = freq.get(n);
    if (cur) cur.count++;
    else freq.set(n, { count: 1, display: tok, techLike });
  }
  [...freq.values()]
    .filter((f) => f.techLike || f.count >= 2)
    .sort((a, b) => Number(b.techLike) - Number(a.techLike) || b.count - a.count)
    .forEach((f) => add(f.display));

  return found.slice(0, limit);
}

export interface FallbackTriage {
  extractedKeywords: string[];
  selectedBulletIds: string[];
  relevantSkills: string[];
  summary: string;
}

/** Keyword-overlap triage used when Chrome's built-in AI is unavailable. */
export function fallbackTriage(vault: MasterVault, jd: string, maxBullets: number): FallbackTriage {
  const keywords = extractKeywords(jd, vault);
  const scored = vault.experience.flatMap((e) =>
    e.bullets.map((b) => ({
      id: b.id,
      score: keywords.filter((k) => textHasKeyword(`${b.text} ${e.role}`, k)).length,
    })),
  );
  const selected = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxBullets)
    .map((s) => s.id);
  return {
    extractedKeywords: keywords,
    selectedBulletIds: selected,
    summary: vault.summary,
    relevantSkills: vault.skills.filter((s) => keywords.some((k) => normalize(k) === normalize(s))),
  };
}

export interface KeywordStatus {
  keyword: string;
  present: boolean;
}

export function keywordStatus(vault: MasterVault, keywords: string[]): KeywordStatus[] {
  const text = vaultText(vault);
  return keywords.map((keyword) => ({ keyword, present: textHasKeyword(text, keyword) }));
}
