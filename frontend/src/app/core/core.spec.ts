import { extractKeywords, fallbackTriage, keywordStatus, textHasKeyword } from './keyword-matcher';
import { defaultVault } from './default-vault';
import { nextId, normalizeVault } from './vault.model';

describe('keyword matcher', () => {
  it('matches whole tokens only', () => {
    expect(textHasKeyword('Built React apps', 'react')).toBeTrue();
    expect(textHasKeyword('Reactive streams', 'react')).toBeFalse();
    expect(textHasKeyword('Used Node.js daily', 'Node.js')).toBeTrue();
    expect(textHasKeyword('C++ developer', 'C++')).toBeTrue();
  });

  it('tolerates plurals on long words', () => {
    expect(textHasKeyword('Built web applications', 'application')) .toBeTrue();
    expect(textHasKeyword('Built web application', 'applications')).toBeTrue();
  });

  it('extracts vault skills found in the JD', () => {
    const v = defaultVault();
    const kws = extractKeywords('We need TypeScript and GraphQL experts. Docker a plus.', v);
    expect(kws).toContain('TypeScript');
    expect(kws).toContain('GraphQL');
  });

  it('fallback triage selects relevant bullets only, honouring the cap', () => {
    const v = defaultVault();
    const res = fallbackTriage(v, 'Looking for GraphQL and Docker experience', 1);
    expect(res.selectedBulletIds.length).toBe(1);
    const all = v.experience.flatMap((e) => e.bullets.map((b) => b.id));
    expect(all).toContain(res.selectedBulletIds[0]);
  });

  it('reports present/missing keywords', () => {
    const st = keywordStatus(defaultVault(), ['TypeScript', 'Kubernetes']);
    expect(st.map((s) => s.present)).toEqual([true, false]);
  });
});

describe('vault model', () => {
  it('normalizes partial input and de-duplicates ids', () => {
    const v = normalizeVault({
      experience: [{ id: 'exp_1', bullets: [{ id: 'b_1', text: 'a' }, { id: 'b_1', text: 'b' }] }],
    });
    const ids = v.experience[0].bullets.map((b) => b.id);
    expect(new Set(ids).size).toBe(2);
    expect(v.settings.theme).toBe('modern-slate');
  });

  it('rejects non-objects', () => {
    expect(() => normalizeVault(null)).toThrow();
  });

  it('generates unique next ids', () => {
    const v = defaultVault();
    expect(nextId(v, 'b')).toBe('b_108');
    expect(nextId(v, 'exp')).toBe('exp_3');
  });
});
