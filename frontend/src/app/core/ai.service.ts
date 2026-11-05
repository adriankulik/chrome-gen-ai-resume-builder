/* eslint-disable @typescript-eslint/no-explicit-any -- parsing untrusted JSON */
import { Injectable, signal } from '@angular/core';
import { MasterVault, normalizeVault } from './vault.model';
import { FallbackTriage, fallbackTriage } from './keyword-matcher';
import { fallbackParseResume } from './fallback-parser';

/* Minimal typings for the Chrome Prompt API (window.LanguageModel). */
interface LMSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface LMStatic {
  availability(options?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options?: object): Promise<LMSession>;
}

export type AiAvailability = 'checking' | 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface TriageResult extends FallbackTriage {
  source: 'ai' | 'fallback';
}

const LANGUAGE_RULE = 'Always write in English.';

const triageSchema = {
  type: 'object',
  properties: {
    extractedKeywords: { type: 'array', items: { type: 'string' } },
    selectedBulletIds: { type: 'array', items: { type: 'string' } },
    relevantSkills: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['extractedKeywords', 'selectedBulletIds', 'relevantSkills', 'summary'],
};

const proposalSchema = {
  type: 'object',
  properties: { proposedBullets: { type: 'array', items: { type: 'string' } } },
  required: ['proposedBullets'],
};

const str = { type: 'string' };
const vaultSchema = {
  type: 'object',
  properties: {
    contact: {
      type: 'object',
      properties: {
        fullName: str, email: str, phone: str, location: str,
        links: { type: 'array', items: str },
      },
      required: ['fullName', 'email', 'phone', 'location', 'links'],
    },
    summary: str,
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: str, company: str, startDate: str, endDate: str,
          bullets: { type: 'array', items: str },
        },
        required: ['role', 'company', 'startDate', 'endDate', 'bullets'],
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: { degree: str, institution: str, year: str },
        required: ['degree', 'institution', 'year'],
      },
    },
    skills: { type: 'array', items: str },
  },
  required: ['contact', 'summary', 'experience', 'education', 'skills'],
};

@Injectable({ providedIn: 'root' })
export class AiService {
  readonly availability = signal<AiAvailability>('checking');
  readonly busy = signal(false);
  /** Model download progress 0..1 (null when unknown / not downloading). */
  readonly downloadProgress = signal<number | null>(null);
  private pollTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.refreshAvailability();
  }

  private get lm(): LMStatic | undefined {
    return (globalThis as unknown as { LanguageModel?: LMStatic }).LanguageModel;
  }

  get isAvailable(): boolean {
    return this.availability() !== 'unavailable' && this.availability() !== 'checking';
  }

  async refreshAvailability(): Promise<void> {
    const lm = this.lm;
    if (!lm) return this.availability.set('unavailable');
    try {
      this.availability.set(await lm.availability(this.langOptions()));
    } catch {
      try {
        this.availability.set(await lm.availability());
      } catch {
        this.availability.set('unavailable');
      }
    }
    this.syncPolling();
  }

  /** While Chrome reports "downloading", re-check periodically so the UI updates when it finishes. */
  private syncPolling(): void {
    const downloading = this.availability() === 'downloading';
    if (downloading && !this.pollTimer) {
      this.pollTimer = setInterval(() => this.refreshAvailability(), 5000);
    } else if (!downloading && this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  /**
   * Explicitly starts / resumes the model download with progress reporting.
   * Must be called from a user gesture (click).
   */
  async startDownload(): Promise<void> {
    const lm = this.lm;
    if (!lm) return;
    this.downloadProgress.set(0);
    const monitor = (m: EventTarget) =>
      m.addEventListener('downloadprogress', (e) =>
        this.downloadProgress.set((e as Event & { loaded: number }).loaded),
      );
    try {
      let session: LMSession;
      try {
        session = await lm.create({ ...this.langOptions(), monitor });
      } catch {
        session = await lm.create({ monitor });
      }
      session.destroy();
    } catch (e) {
      console.warn('Model download failed', e);
    } finally {
      this.downloadProgress.set(null);
      await this.refreshAvailability();
    }
  }

  /** Language hints: the app is English-only. */
  private langOptions() {
    return {
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    };
  }

  private async createSession(systemPrompt: string): Promise<LMSession> {
    const lm = this.lm;
    if (!lm) throw new Error('Chrome built-in AI is not available');
    const initialPrompts = [{ role: 'system', content: systemPrompt }];
    try {
      return await lm.create({ initialPrompts, ...this.langOptions() });
    } catch {
      return await lm.create({ initialPrompts });
    }
  }

  private async promptJson<T>(system: string, input: string, schema: object): Promise<T> {
    this.busy.set(true);
    let session: LMSession | undefined;
    try {
      session = await this.createSession(system);
      const out = await session.prompt(input, { responseConstraint: schema });
      return JSON.parse(out) as T;
    } finally {
      session?.destroy();
      this.busy.set(false);
      this.refreshAvailability();
    }
  }

  /** Prompt 1: ATS triage. Falls back to keyword matching when AI is unavailable or fails. */
  async triage(vault: MasterVault, jd: string, maxBullets: number): Promise<TriageResult> {
    if (this.availability() === 'unavailable' || !this.lm) {
      return { ...fallbackTriage(vault, jd, maxBullets), source: 'fallback' };
    }
    const compact = {
      summary: vault.summary,
      skills: vault.skills,
      experience: vault.experience.map((e) => ({
        role: e.role,
        company: e.company,
        bullets: e.bullets.map((b) => ({ id: b.id, text: b.text })),
      })),
    };
    const system =
      'You are an expert ATS Resume Filter. Given a Master Resume JSON and a Job Description, return the IDs of the most relevant bullet points (`selectedBulletIds`) that prove the candidate fits the role. Do not invent IDs. ' +
      `Select at most ${maxBullets} bullet IDs. Put the key hard and soft skills of the job description in extractedKeywords, and the candidate's skills (copied exactly from the resume's skills list) that best match them in relevantSkills, most relevant first. Write the "summary" field as a 2-3 sentence professional summary tailored to the job description, using only facts present in the resume. ` +
      LANGUAGE_RULE;
    try {
      const res = await this.promptJson<FallbackTriage>(
        system,
        `MASTER RESUME:\n${JSON.stringify(compact)}\n\nJOB DESCRIPTION:\n${jd}`,
        triageSchema,
      );
      const valid = new Set(vault.experience.flatMap((e) => e.bullets.map((b) => b.id)));
      const ids = [...new Set(res.selectedBulletIds)].filter((id) => valid.has(id)).slice(0, maxBullets);
      if (!ids.length) throw new Error('Model returned no valid bullet IDs');
      return {
        extractedKeywords: [...new Set((res.extractedKeywords ?? []).map((k) => k.trim()).filter(Boolean))],
        selectedBulletIds: ids,
        relevantSkills: res.relevantSkills ?? [],
        summary: (res.summary ?? '').trim() || vault.summary,
        source: 'ai',
      };
    } catch (e) {
      console.warn('AI triage failed, using keyword fallback', e);
      return { ...fallbackTriage(vault, jd, maxBullets), source: 'fallback' };
    }
  }

  /** Prompt 2: propose new bullets for a role bridging missing keywords. Throws if AI is unavailable. */
  async proposeBullets(
    vault: MasterVault,
    expId: string,
    jd: string,
    missingKeywords: string[],
  ): Promise<string[]> {
    const exp = vault.experience.find((e) => e.id === expId);
    if (!exp) return [];
    const system =
      'Rewrite or propose 2 strong, metric-driven resume bullet points for the specified role that naturally incorporate the missing job description keywords. ' +
      'Only describe plausible work for this role; keep each bullet to one sentence. ' +
      LANGUAGE_RULE;
    const input =
      `ROLE: ${exp.role} at ${exp.company}\nEXISTING BULLETS:\n${exp.bullets.map((b) => `- ${b.text}`).join('\n')}\n\n` +
      `MISSING KEYWORDS: ${missingKeywords.join(', ') || '(none)'}\n\nJOB DESCRIPTION:\n${jd}`;
    const res = await this.promptJson<{ proposedBullets: string[] }>(system, input, proposalSchema);
    return (res.proposedBullets ?? []).map((b) => b.trim()).filter(Boolean).slice(0, 2);
  }

  /** Converts pasted raw resume text into a MasterVault. Uses Chrome built-in AI when available, otherwise falls back to heuristic parsing. */
  async parseResume(text: string, base: MasterVault): Promise<MasterVault> {
    if (this.availability() === 'unavailable' || !this.lm) {
      return fallbackParseResume(text, base);
    }
    const system =
      'You convert unstructured resume text into structured JSON. Copy text faithfully; do not invent facts. Keep each achievement as a separate bullet string. ' +
      'Use dates like "2022-03" or "Present" when possible. ' +
      LANGUAGE_RULE;
    try {
      const raw = await this.promptJson<any>(system, text, vaultSchema);
      // Assign deterministic IDs (bullets arrive as plain strings).
      let b = 100;
      const withIds = {
        ...raw,
        experience: (raw.experience ?? []).map((e: any, i: number) => ({
          ...e,
          id: `exp_${i + 1}`,
          bullets: (e.bullets ?? []).map((t: string) => ({ id: `b_${++b}`, text: t })),
        })),
        education: (raw.education ?? []).map((e: any, i: number) => ({ ...e, id: `edu_${i + 1}` })),
        settings: base.settings,
      };
      const vault = normalizeVault(withIds);
      vault.contact.photoDataUrl = base.contact.photoDataUrl;
      return vault;
    } catch (e) {
      console.warn('AI resume parsing failed, using heuristic fallback', e);
      return fallbackParseResume(text, base);
    }
  }
}
