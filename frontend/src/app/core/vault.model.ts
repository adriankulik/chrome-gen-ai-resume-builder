/* eslint-disable @typescript-eslint/no-explicit-any -- parsing untrusted JSON */
export interface Bullet {
  id: string;
  text: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  bullets: Bullet[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  year: string;
}

export type ThemeName = 'classic-serif' | 'modern-slate' | 'minimal-mono';

export interface VaultSettings {
  theme: ThemeName;
  showPhoto: boolean;
  strictOnePage: boolean;
  includeRodoClause: boolean;
  rodoCompanyName: string;
}

export interface Contact {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: string[];
  photoDataUrl: string;
}

export interface MasterVault {
  contact: Contact;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  settings: VaultSettings;
}

export const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'classic-serif', label: 'Classic Serif' },
  { value: 'modern-slate', label: 'Modern Slate' },
  { value: 'minimal-mono', label: 'Minimal Mono' },
];

export function emptyVault(): MasterVault {
  return {
    contact: { fullName: '', email: '', phone: '', location: '', links: [], photoDataUrl: '' },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    settings: {
      theme: 'modern-slate',
      showPhoto: true,
      strictOnePage: true,
      includeRodoClause: true,
      rodoCompanyName: '',
    },
  };
}

/** Coerces arbitrary parsed JSON (import / AI output) into a valid vault. */
export function normalizeVault(raw: unknown): MasterVault {
  const base = emptyVault();
  if (!raw || typeof raw !== 'object') throw new Error('Vault must be a JSON object');
  const r = raw as Record<string, any>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);

  const c = (r['contact'] ?? {}) as Record<string, unknown>;
  base.contact = {
    fullName: str(c['fullName']),
    email: str(c['email']),
    phone: str(c['phone']),
    location: str(c['location']),
    links: strArr(c['links']),
    photoDataUrl: str(c['photoDataUrl']),
  };
  base.summary = str(r['summary']);
  base.skills = strArr(r['skills']);

  const used = new Set<string>();
  const uid = (prefix: string, given: unknown) => {
    let id = typeof given === 'string' && given && !used.has(given) ? given : '';
    let n = used.size + 1;
    while (!id || used.has(id)) id = `${prefix}_${n++}`;
    used.add(id);
    return id;
  };

  base.experience = (Array.isArray(r['experience']) ? r['experience'] : []).map((e: any) => ({
    id: uid('exp', e?.id),
    role: str(e?.role),
    company: str(e?.company),
    startDate: str(e?.startDate),
    endDate: str(e?.endDate),
    bullets: (Array.isArray(e?.bullets) ? e.bullets : []).map((b: any) => ({
      id: uid('b', b?.id),
      text: str(b?.text ?? b),
    })),
  }));
  base.education = (Array.isArray(r['education']) ? r['education'] : []).map((e: any) => ({
    id: uid('edu', e?.id),
    degree: str(e?.degree),
    institution: str(e?.institution),
    year: str(e?.year),
  }));

  const s = (r['settings'] ?? {}) as Record<string, any>;
  const themes = THEMES.map((t) => t.value);
  base.settings = {
    theme: themes.includes(s['theme']) ? s['theme'] : base.settings.theme,
    showPhoto: typeof s['showPhoto'] === 'boolean' ? s['showPhoto'] : base.settings.showPhoto,
    strictOnePage:
      typeof s['strictOnePage'] === 'boolean' ? s['strictOnePage'] : base.settings.strictOnePage,
    includeRodoClause:
      typeof s['includeRodoClause'] === 'boolean'
        ? s['includeRodoClause']
        : base.settings.includeRodoClause,
    rodoCompanyName: str(s['rodoCompanyName']),
  };
  return base;
}

/** Generates the next unique id with the given prefix across the whole vault. */
export function nextId(vault: MasterVault, prefix: 'exp' | 'b' | 'edu'): string {
  const ids = new Set<string>();
  vault.experience.forEach((e) => {
    ids.add(e.id);
    e.bullets.forEach((b) => ids.add(b.id));
  });
  vault.education.forEach((e) => ids.add(e.id));
  let n = prefix === 'b' ? 101 : 1;
  while (ids.has(`${prefix}_${n}`)) n++;
  return `${prefix}_${n}`;
}
