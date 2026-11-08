import { TestBed } from '@angular/core/testing';
import { AiService } from './ai.service';
import { StorageService } from './storage.service';
import { emptyVault, MasterVault } from './vault.model';

describe('AiService', () => {
  let service: AiService;
  let originalLM: unknown;
  let originalFetch: typeof globalThis.fetch;

  const mockVault: MasterVault = {
    ...emptyVault(),
    summary: 'Master summary of candidate',
    skills: ['TypeScript', 'Angular', 'Node.js', 'Docker'],
    experience: [
      {
        id: 'exp_1',
        role: 'Frontend Engineer',
        company: 'Acme Corp',
        startDate: '2021-01',
        endDate: 'Present',
        bullets: [
          { id: 'b_101', text: 'Built reactive user interfaces with Angular and TypeScript' },
          { id: 'b_102', text: 'Implemented state management and reduced latency by 30%' },
        ],
      },
    ],
  };

  beforeEach(() => {
    localStorage.clear();
    originalLM = (globalThis as Record<string, unknown>)['LanguageModel'];
    originalFetch = globalThis.fetch;
    delete (globalThis as Record<string, unknown>)['LanguageModel'];

    TestBed.configureTestingModule({
      providers: [AiService, StorageService],
    });
    service = TestBed.inject(AiService);
  });

  afterEach(() => {
    (globalThis as Record<string, unknown>)['LanguageModel'] = originalLM;
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it('initializes with default config and unavailable status when no models present', async () => {
    expect(service.config().provider).toBe('auto');
    expect(service.config().localEndpoint).toBe('http://localhost:11434/v1');
    await service.refreshAvailability();
    expect(service.availability()).toBe('unavailable');
    expect(service.activeProviderLabel()).toBe('Local matching');
    expect(service.isAvailable).toBeFalse();
  });

  it('detects Chrome Gemini Nano in auto mode when LanguageModel is available', async () => {
    (globalThis as Record<string, unknown>)['LanguageModel'] = {
      availability: jasmine.createSpy('availability').and.resolveTo('available'),
      create: jasmine.createSpy('create'),
    };

    await service.refreshAvailability();
    expect(service.availability()).toBe('available');
    expect(service.activeProviderLabel()).toBe('Gemini Nano');
    expect(service.isAvailable).toBeTrue();
  });

  it('detects Local OpenAI runner when Nano is unavailable in auto mode', async () => {
    delete (globalThis as Record<string, unknown>)['LanguageModel'];
    spyOn(service.localProvider, 'isAvailable').and.resolveTo(true);

    await service.refreshAvailability();
    expect(service.availability()).toBe('available');
    expect(service.activeProviderLabel()).toContain('Ollama');
    expect(service.isAvailable).toBeTrue();
  });

  it('updates configuration and persists to storage', async () => {
    await service.updateConfig({
      provider: 'local-openai',
      localEndpoint: 'http://localhost:1234/v1',
      localModel: 'mistral',
    });

    expect(service.config().provider).toBe('local-openai');
    expect(service.config().localEndpoint).toBe('http://localhost:1234/v1');
    expect(service.config().localModel).toBe('mistral');
  });

  describe('triage', () => {
    it('uses fallback triage when AI is unavailable', async () => {
      const result = await service.triage(mockVault, 'Looking for an Angular and TypeScript developer', 5);
      expect(result.source).toBe('fallback');
      expect(result.selectedBulletIds).toContain('b_101');
    });

    it('returns AI triage result when provider succeeds', async () => {
      spyOn(service, 'resolveActiveProvider').and.resolveTo({
        id: 'local-openai',
        name: 'Mock Provider',
        isAvailable: async () => true,
        generateJson: async <T>() =>
          ({
            extractedKeywords: ['Angular', 'TypeScript'],
            selectedBulletIds: ['b_101'],
            relevantSkills: ['Angular', 'TypeScript'],
            summary: 'Highly tailored summary for the Angular role.',
          }) as unknown as T,
      });

      const result = await service.triage(mockVault, 'Job description text', 5);
      expect(result.source).toBe('ai');
      expect(result.selectedBulletIds).toEqual(['b_101']);
      expect(result.summary).toBe('Highly tailored summary for the Angular role.');
      expect(result.relevantSkills).toEqual(['Angular', 'TypeScript']);
    });

    it('falls back seamlessly to heuristic triage when AI provider throws', async () => {
      spyOn(service, 'resolveActiveProvider').and.resolveTo({
        id: 'local-openai',
        name: 'Failing Provider',
        isAvailable: async () => true,
        generateJson: async () => {
          throw new Error('Model hallucinated or timed out');
        },
      });

      const result = await service.triage(mockVault, 'Looking for Angular', 5);
      expect(result.source).toBe('fallback');
      expect(result.selectedBulletIds.length).toBeGreaterThan(0);
    });
  });

  describe('proposeBullets', () => {
    it('returns empty array if expId is not found', async () => {
      const bullets = await service.proposeBullets(mockVault, 'non_existent', 'JD', ['Docker']);
      expect(bullets).toEqual([]);
    });

    it('returns proposed bullets from active AI provider', async () => {
      spyOn(service, 'resolveActiveProvider').and.resolveTo({
        id: 'local-openai',
        name: 'Mock Provider',
        isAvailable: async () => true,
        generateJson: async <T>() =>
          ({
            proposedBullets: ['Containerized microservices with Docker reducing build times by 40%.'],
          }) as unknown as T,
      });

      const bullets = await service.proposeBullets(mockVault, 'exp_1', 'JD', ['Docker']);
      expect(bullets).toEqual(['Containerized microservices with Docker reducing build times by 40%.']);
    });
  });

  describe('parseResume', () => {
    it('parses structured resume using active provider', async () => {
      spyOn(service, 'resolveActiveProvider').and.resolveTo({
        id: 'local-openai',
        name: 'Mock Provider',
        isAvailable: async () => true,
        generateJson: async <T>() =>
          ({
            contact: {
              fullName: 'Jane Doe',
              email: 'jane@example.com',
              phone: '123-456-7890',
              location: 'San Francisco, CA',
              links: ['linkedin.com/in/janedoe'],
            },
            summary: 'Cloud Architect with 8+ years experience',
            experience: [
              {
                role: 'Cloud Architect',
                company: 'CloudWorks',
                startDate: '2020-01',
                endDate: 'Present',
                bullets: ['Architected multi-region Kubernetes clusters'],
              },
            ],
            education: [{ degree: 'B.S. CS', institution: 'MIT', year: '2019' }],
            skills: ['Kubernetes', 'AWS', 'Terraform'],
          }) as unknown as T,
      });

      const vault = await service.parseResume('Raw resume text', mockVault);
      expect(vault.contact.fullName).toBe('Jane Doe');
      expect(vault.experience[0].company).toBe('CloudWorks');
      expect(vault.experience[0].bullets[0].text).toBe('Architected multi-region Kubernetes clusters');
      expect(vault.skills).toEqual(['Kubernetes', 'AWS', 'Terraform']);
    });

    it('falls back to heuristic parseResume when active provider throws', async () => {
      spyOn(service, 'resolveActiveProvider').and.resolveTo({
        id: 'local-openai',
        name: 'Failing Provider',
        isAvailable: async () => true,
        generateJson: async () => {
          throw new Error('Parsing error');
        },
      });

      const sample = 'John Smith\njohn@example.com\n\nExperience\nDeveloper at TechCorp\n- Wrote code';
      const vault = await service.parseResume(sample, mockVault);
      expect(vault.contact.fullName).toBe('John Smith');
      expect(vault.contact.email).toBe('john@example.com');
    });
  });

  describe('testConnection', () => {
    it('returns ok and models list on successful connection', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo(
        new Response(
          JSON.stringify({
            data: [{ id: 'llama3.2:latest' }, { id: 'mistral:latest' }],
          }),
          { status: 200 },
        ),
      );

      const res = await service.testConnection('http://localhost:11434/v1');
      expect(res.ok).toBeTrue();
      expect(res.models).toEqual(['llama3.2:latest', 'mistral:latest']);
      expect(res.message).toContain('Successfully connected');
    });

    it('returns error message when endpoint is unreachable', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new TypeError('Failed to fetch'));

      const res = await service.testConnection('http://localhost:9999/v1');
      expect(res.ok).toBeFalse();
      expect(res.message).toContain('Could not connect');
    });
  });
});
