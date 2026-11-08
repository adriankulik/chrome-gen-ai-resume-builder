/* eslint-disable @typescript-eslint/no-explicit-any -- parsing untrusted JSON */
import { Injectable, inject, signal } from '@angular/core';
import { MasterVault, normalizeVault } from './vault.model';
import { FallbackTriage, fallbackTriage } from './keyword-matcher';
import { fallbackParseResume } from './fallback-parser';
import { StorageService } from './storage.service';
import {
  AiConfig,
  AiProvider,
  DEFAULT_AI_CONFIG,
} from './ai/ai-provider.model';
import { ChromeNanoProvider } from './ai/chrome-nano-provider';
import { LocalOpenAiProvider, normalizeEndpoint } from './ai/local-openai-provider';

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
  private readonly storage = inject(StorageService);

  readonly config = signal<AiConfig>(DEFAULT_AI_CONFIG);
  readonly availability = signal<AiAvailability>('checking');
  readonly activeProviderLabel = signal<string>('Detecting…');
  readonly busy = signal(false);
  /** Model download progress 0..1 (null when unknown / not downloading). */
  readonly downloadProgress = signal<number | null>(null);

  readonly nanoProvider = new ChromeNanoProvider();
  readonly localProvider = new LocalOpenAiProvider();

  private pollTimer?: ReturnType<typeof setInterval>;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    const saved = await this.storage.get<AiConfig>('ai-config');
    if (saved) {
      this.config.set({ ...DEFAULT_AI_CONFIG, ...saved });
      this.localProvider.updateConfig(
        saved.localEndpoint || DEFAULT_AI_CONFIG.localEndpoint,
        saved.localModel || DEFAULT_AI_CONFIG.localModel,
        saved.localApiKey,
      );
    }
    await this.refreshAvailability();
  }

  get isAvailable(): boolean {
    return this.availability() !== 'unavailable' && this.availability() !== 'checking';
  }

  async updateConfig(partial: Partial<AiConfig>): Promise<void> {
    const next: AiConfig = { ...this.config(), ...partial };
    this.config.set(next);
    this.localProvider.updateConfig(next.localEndpoint, next.localModel, next.localApiKey);
    await this.storage.set('ai-config', next);
    await this.refreshAvailability();
  }

  /**
   * Tests connection to a specific local endpoint and returns model list.
   */
  async testConnection(
    endpoint: string,
    apiKey?: string,
  ): Promise<{ ok: boolean; message: string; models: string[] }> {
    const normalized = normalizeEndpoint(endpoint);
    const testProvider = new LocalOpenAiProvider(normalized, 'test', apiKey);
    const ok = await testProvider.isAvailable();
    if (!ok) {
      return {
        ok: false,
        message: `Could not connect to ${normalized}. Verify that Ollama or LM Studio is running.`,
        models: [],
      };
    }
    const models = await testProvider.listModels();
    return {
      ok: true,
      message: `Successfully connected to ${normalized}!`,
      models,
    };
  }

  async refreshAvailability(): Promise<void> {
    const cfg = this.config();

    if (cfg.provider === 'chrome-nano') {
      const nanoStatus = await this.nanoProvider.checkAvailabilityStatus();
      this.availability.set(nanoStatus);
      if (nanoStatus === 'available') {
        this.activeProviderLabel.set('Nano ready');
      } else if (nanoStatus === 'downloading') {
        this.activeProviderLabel.set('Downloading Nano…');
      } else if (nanoStatus === 'downloadable') {
        this.activeProviderLabel.set('Downloadable');
      } else {
        this.activeProviderLabel.set('Local matching');
      }
      this.syncPolling();
      return;
    }

    if (cfg.provider === 'local-openai') {
      const localOk = await this.localProvider.isAvailable();
      if (localOk) {
        this.availability.set('available');
        this.activeProviderLabel.set(this.formatLocalLabel(cfg));
      } else {
        this.availability.set('unavailable');
        this.activeProviderLabel.set('Local matching');
      }
      this.syncPolling();
      return;
    }

    // Auto mode: Prefer Chrome Nano, then check Local OpenAI, then fallback
    const nanoStatus = await this.nanoProvider.checkAvailabilityStatus();
    if (nanoStatus === 'available') {
      this.availability.set('available');
      this.activeProviderLabel.set('Nano ready');
    } else if (nanoStatus === 'downloading' || nanoStatus === 'downloadable') {
      this.availability.set(nanoStatus);
      this.activeProviderLabel.set(
        nanoStatus === 'downloading' ? 'Downloading Nano…' : 'Downloadable',
      );
    } else {
      // Chrome Nano is unavailable; test local runner
      const localOk = await this.localProvider.isAvailable();
      if (localOk) {
        this.availability.set('available');
        this.activeProviderLabel.set(this.formatLocalLabel(cfg));
      } else {
        this.availability.set('unavailable');
        this.activeProviderLabel.set('Local matching');
      }
    }

    this.syncPolling();
  }

  private formatLocalLabel(cfg: AiConfig): string {
    const ep = cfg.localEndpoint.toLowerCase();
    if (ep.includes('11434')) return `Ollama (${cfg.localModel || 'local'})`;
    if (ep.includes('1234')) return `LM Studio (${cfg.localModel || 'local'})`;
    return `Local AI (${cfg.localModel || 'ready'})`;
  }

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
   * Explicitly starts / resumes Chrome Nano model download.
   */
  async startDownload(): Promise<void> {
    const lm = (globalThis as any).LanguageModel;
    if (!lm) return;
    this.downloadProgress.set(0);
    const monitor = (m: EventTarget) =>
      m.addEventListener('downloadprogress', (e) =>
        this.downloadProgress.set((e as Event & { loaded: number }).loaded),
      );
    try {
      const session = await lm.create({ monitor });
      session.destroy();
    } catch (e) {
      console.warn('Model download failed', e);
    } finally {
      this.downloadProgress.set(null);
      await this.refreshAvailability();
    }
  }

  /** Resolves the currently active provider based on configuration and availability. */
  async resolveActiveProvider(): Promise<AiProvider | null> {
    const cfg = this.config();

    if (cfg.provider === 'chrome-nano') {
      return (await this.nanoProvider.isAvailable()) ? this.nanoProvider : null;
    }

    if (cfg.provider === 'local-openai') {
      return (await this.localProvider.isAvailable()) ? this.localProvider : null;
    }

    // Auto mode
    if (await this.nanoProvider.isAvailable()) {
      return this.nanoProvider;
    }
    if (await this.localProvider.isAvailable()) {
      return this.localProvider;
    }
    return null;
  }

  private async promptJson<T>(system: string, input: string, schema: object): Promise<T> {
    this.busy.set(true);
    try {
      const provider = await this.resolveActiveProvider();
      if (!provider) {
        throw new Error('No AI provider available');
      }
      return await provider.generateJson<T>(system, input, schema);
    } finally {
      this.busy.set(false);
      this.refreshAvailability();
    }
  }

  /** Prompt 1: ATS triage. Falls back to keyword matching when AI is unavailable or fails. */
  async triage(vault: MasterVault, jd: string, maxBullets: number): Promise<TriageResult> {
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
      const ids = [...new Set(res.selectedBulletIds || [])].filter((id) => valid.has(id)).slice(0, maxBullets);
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

  /** Converts pasted raw resume text into a MasterVault. Uses active AI provider when available, otherwise falls back to heuristic parsing. */
  async parseResume(text: string, base: MasterVault): Promise<MasterVault> {
    const system =
      'You convert unstructured resume text into structured JSON. Copy text faithfully; do not invent facts. Keep each achievement as a separate bullet string. ' +
      'Use dates like "2022-03" or "Present" when possible. ' +
      LANGUAGE_RULE;
    try {
      const raw = await this.promptJson<any>(system, text, vaultSchema);
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
