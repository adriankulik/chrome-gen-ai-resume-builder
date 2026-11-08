import { ChromeNanoProvider } from './chrome-nano-provider';

describe('ChromeNanoProvider', () => {
  let provider: ChromeNanoProvider;
  let originalLM: unknown;

  beforeEach(() => {
    provider = new ChromeNanoProvider();
    originalLM = (globalThis as Record<string, unknown>)['LanguageModel'];
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>)['LanguageModel'] = originalLM;
  });

  it('reports unavailable when window.LanguageModel is undefined', async () => {
    delete (globalThis as Record<string, unknown>)['LanguageModel'];
    const status = await provider.checkAvailabilityStatus();
    expect(status).toBe('unavailable');
    expect(await provider.isAvailable()).toBeFalse();
  });

  it('checks availability using LanguageModel.availability()', async () => {
    (globalThis as Record<string, unknown>)['LanguageModel'] = {
      availability: jasmine.createSpy('availability').and.resolveTo('available'),
      create: jasmine.createSpy('create'),
    };

    const status = await provider.checkAvailabilityStatus();
    expect(status).toBe('available');
    expect(await provider.isAvailable()).toBeTrue();
  });

  it('executes prompt through created session and extracts JSON', async () => {
    const mockSession = {
      prompt: jasmine.createSpy('prompt').and.resolveTo('```json\n{"summary": "Test summary"}\n```'),
      destroy: jasmine.createSpy('destroy'),
    };
    (globalThis as Record<string, unknown>)['LanguageModel'] = {
      availability: jasmine.createSpy('availability').and.resolveTo('available'),
      create: jasmine.createSpy('create').and.resolveTo(mockSession),
    };

    const result = await provider.generateJson<{ summary: string }>('System prompt', 'User prompt', {
      type: 'object',
    });

    expect(result.summary).toBe('Test summary');
    expect(mockSession.prompt).toHaveBeenCalled();
    expect(mockSession.destroy).toHaveBeenCalled();
  });

  it('destroys session even if session.prompt throws', async () => {
    const mockSession = {
      prompt: jasmine.createSpy('prompt').and.rejectWith(new Error('Prompt aborted')),
      destroy: jasmine.createSpy('destroy'),
    };
    (globalThis as Record<string, unknown>)['LanguageModel'] = {
      availability: jasmine.createSpy('availability').and.resolveTo('available'),
      create: jasmine.createSpy('create').and.resolveTo(mockSession),
    };

    await expectAsync(provider.generateJson('System', 'User')).toBeRejectedWithError('Prompt aborted');
    expect(mockSession.destroy).toHaveBeenCalled();
  });
});
