import { LocalOpenAiProvider, normalizeEndpoint } from './local-openai-provider';

describe('LocalOpenAiProvider', () => {
  let provider: LocalOpenAiProvider;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    provider = new LocalOpenAiProvider('http://localhost:11434/v1', 'llama3.2');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('normalizeEndpoint', () => {
    it('appends http:// if missing and /v1', () => {
      expect(normalizeEndpoint('localhost:11434')).toBe('http://localhost:11434/v1');
    });

    it('strips trailing slashes and ensures /v1 suffix', () => {
      expect(normalizeEndpoint('http://localhost:11434/')).toBe('http://localhost:11434/v1');
      expect(normalizeEndpoint('http://localhost:11434/v1/')).toBe('http://localhost:11434/v1');
    });

    it('handles empty input with default Ollama port', () => {
      expect(normalizeEndpoint('')).toBe('http://localhost:11434/v1');
    });
  });

  describe('isAvailable', () => {
    it('returns true when /models responds with 200 OK', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(new Response('{"data":[]}', { status: 200 }));

      const available = await provider.isAvailable();
      expect(available).toBeTrue();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/v1/models',
        jasmine.objectContaining({ method: 'GET' }),
      );
    });

    it('returns false when /models fails or returns non-200', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(new Response('error', { status: 500 }));

      const available = await provider.isAvailable();
      expect(available).toBeFalse();
    });

    it('returns false when fetch rejects (connection refused / server down)', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new TypeError('Failed to fetch'));

      const available = await provider.isAvailable();
      expect(available).toBeFalse();
    });
  });

  describe('listModels', () => {
    it('extracts model ids from /models payload', async () => {
      const payload = {
        data: [
          { id: 'llama3.2:latest', object: 'model' },
          { id: 'mistral:latest', object: 'model' },
        ],
      };
      globalThis.fetch = jasmine
        .createSpy('fetch')
        .and.resolveTo(new Response(JSON.stringify(payload), { status: 200 }));

      const models = await provider.listModels();
      expect(models).toEqual(['llama3.2:latest', 'mistral:latest']);
    });

    it('returns empty array when endpoint fails', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Network error'));
      const models = await provider.listModels();
      expect(models).toEqual([]);
    });
  });

  describe('generateJson', () => {
    it('sends OpenAI chat completion request and parses JSON content', async () => {
      const fakeResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"selectedBulletIds": ["b_101", "b_102"], "summary": "Great match"}',
            },
          },
        ],
      };

      globalThis.fetch = jasmine
        .createSpy('fetch')
        .and.resolveTo(new Response(JSON.stringify(fakeResponse), { status: 200 }));

      const res = await provider.generateJson<{ selectedBulletIds: string[]; summary: string }>(
        'System prompt instruction',
        'User prompt content',
      );

      expect(res.selectedBulletIds).toEqual(['b_101', 'b_102']);
      expect(res.summary).toBe('Great match');

      const [url, init] = (globalThis.fetch as jasmine.Spy).calls.mostRecent().args;
      expect(url).toBe('http://localhost:11434/v1/chat/completions');
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('llama3.2');
      expect(body.messages.length).toBe(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toBe('User prompt content');
    });

    it('retries without response_format if server returns 400 Bad Request', async () => {
      const fakeResponse = {
        choices: [
          {
            message: {
              role: 'assistant',
              content: '{"retry": true}',
            },
          },
        ],
      };

      let callCount = 0;
      globalThis.fetch = jasmine.createSpy('fetch').and.callFake(async () => {
        callCount++;
        if (callCount === 1) {
          return new Response('response_format unsupported', { status: 400 });
        }
        return new Response(JSON.stringify(fakeResponse), { status: 200 });
      });

      const res = await provider.generateJson<{ retry: boolean }>('System', 'User');
      expect(res.retry).toBeTrue();
      expect(callCount).toBe(2);

      const secondInit = (globalThis.fetch as jasmine.Spy).calls.argsFor(1)[1];
      const secondBody = JSON.parse(secondInit.body as string);
      expect(secondBody.response_format).toBeUndefined();
    });

    it('throws descriptive error on server connection error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new TypeError('Failed to fetch'));

      await expectAsync(provider.generateJson('System', 'User')).toBeRejectedWithError(
        /Failed to connect to local AI endpoint/,
      );
    });
  });
});
