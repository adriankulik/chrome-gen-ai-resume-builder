import { AiProvider } from './ai-provider.model';
import { extractJson } from './json-extractor';

export function normalizeEndpoint(url: string): string {
  let clean = (url || '').trim().replace(/\/+$/, '');
  if (!clean) return 'http://localhost:11434/v1';
  if (!/^https?:\/\//i.test(clean)) {
    clean = `http://${clean}`;
  }
  if (!clean.endsWith('/v1')) {
    clean = `${clean}/v1`;
  }
  return clean;
}

export class LocalOpenAiProvider implements AiProvider {
  readonly id = 'local-openai' as const;
  get name(): string {
    return `Local AI (${this.model || 'OpenAI-compatible'})`;
  }

  constructor(
    private endpoint: string = 'http://localhost:11434/v1',
    private model: string = 'llama3.2',
    private apiKey?: string,
  ) {}

  updateConfig(endpoint: string, model: string, apiKey?: string): void {
    this.endpoint = endpoint;
    this.model = model;
    this.apiKey = apiKey;
  }

  get normalizedEndpoint(): string {
    return normalizeEndpoint(this.endpoint);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey && this.apiKey.trim()) {
      headers['Authorization'] = `Bearer ${this.apiKey.trim()}`;
    }
    return headers;
  }

  private createTimeoutSignal(ms = 3500): AbortSignal {
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
      return AbortSignal.timeout(ms);
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }

  /**
   * Tests whether the local endpoint is alive and accepting requests.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const url = `${this.normalizedEndpoint}/models`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetches the list of models installed on the local server (Ollama, LM Studio, etc.).
   */
  async listModels(): Promise<string[]> {
    try {
      const url = `${this.normalizedEndpoint}/models`;
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: this.createTimeoutSignal(4000),
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (Array.isArray(data?.data)) {
        return data.data.map((m: { id?: string }) => m.id || '').filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }

  async generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const url = `${this.normalizedEndpoint}/chat/completions`;
    const fullSystemPrompt = `${systemPrompt}\n\nCRITICAL INSTRUCTION: Respond ONLY with a valid JSON object. Do not include markdown codeblocks or conversational text.`;

    const makePayload = (useFormat: boolean) => ({
      model: this.model || 'default',
      messages: [
        { role: 'system', content: fullSystemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      ...(useFormat ? { response_format: { type: 'json_object' } } : {}),
    });

    let res: Response;
    try {
      // First attempt: with json_object response_format
      res = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(makePayload(true)),
      });

      // If server doesn't support response_format (HTTP 400), retry without it
      if (res.status === 400) {
        res = await fetch(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(makePayload(false)),
        });
      }
    } catch (err: unknown) {
      throw new Error(
        `Failed to connect to local AI endpoint at ${this.normalizedEndpoint}. Please verify that Ollama/LM Studio is running. (${err instanceof Error ? err.message : String(err)})`,
        { cause: err },
      );
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `Local AI server returned HTTP ${res.status} (${res.statusText}): ${errText.slice(0, 150)}`,
      );
    }

    const json = await res.json();
    const rawContent = json?.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('Local AI returned empty or invalid response format');
    }

    return extractJson<T>(rawContent);
  }
}
