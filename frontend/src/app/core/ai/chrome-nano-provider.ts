import { AiProvider } from './ai-provider.model';
import { extractJson } from './json-extractor';

export interface LMSession {
  prompt(input: string, options?: { responseConstraint?: object; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}

export interface LMStatic {
  availability(options?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(options?: object): Promise<LMSession>;
}

export class ChromeNanoProvider implements AiProvider {
  readonly id = 'chrome-nano' as const;
  readonly name = 'Chrome Built-in AI (Gemini Nano)';

  private get lm(): LMStatic | undefined {
    return (globalThis as unknown as { LanguageModel?: LMStatic }).LanguageModel;
  }

  private langOptions() {
    return {
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    };
  }

  async checkAvailabilityStatus(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'> {
    const lm = this.lm;
    if (!lm) return 'unavailable';
    try {
      return await lm.availability(this.langOptions());
    } catch {
      try {
        return await lm.availability();
      } catch {
        return 'unavailable';
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    const status = await this.checkAvailabilityStatus();
    return status === 'available';
  }

  async createSession(systemPrompt: string): Promise<LMSession> {
    const lm = this.lm;
    if (!lm) throw new Error('Chrome Built-in AI (LanguageModel) is not available');
    const initialPrompts = [{ role: 'system', content: systemPrompt }];
    try {
      return await lm.create({ initialPrompts, ...this.langOptions() });
    } catch {
      return await lm.create({ initialPrompts });
    }
  }

  async generateJson<T>(systemPrompt: string, userPrompt: string, schema?: object): Promise<T> {
    const session = await this.createSession(systemPrompt);
    try {
      let out: string;
      if (schema) {
        try {
          out = await session.prompt(userPrompt, { responseConstraint: schema });
        } catch {
          out = await session.prompt(userPrompt);
        }
      } else {
        out = await session.prompt(userPrompt);
      }
      return extractJson<T>(out);
    } finally {
      session.destroy();
    }
  }
}
