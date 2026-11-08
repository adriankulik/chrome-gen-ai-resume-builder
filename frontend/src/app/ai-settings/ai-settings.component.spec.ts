import { TestBed } from '@angular/core/testing';
import { AiSettingsComponent } from './ai-settings.component';
import { AiService } from '../core/ai.service';
import { StorageService } from '../core/storage.service';

describe('AiSettingsComponent', () => {
  let component: AiSettingsComponent;
  let aiService: AiService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AiSettingsComponent],
      providers: [AiService, StorageService],
    }).compileComponents();

    const fixture = TestBed.createComponent(AiSettingsComponent);
    component = fixture.componentInstance;
    aiService = TestBed.inject(AiService);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes draft fields with current aiService config', () => {
    expect(component.provider()).toBe('auto');
    expect(component.localEndpoint()).toBe('http://localhost:11434/v1');
    expect(component.localModel()).toBe('llama3.2');
  });

  it('applies presets correctly', () => {
    const lmStudioPreset = component.presets.find((p) => p.name === 'LM Studio')!;
    component.applyPreset(lmStudioPreset);

    expect(component.localEndpoint()).toBe('http://localhost:1234/v1');
    expect(component.localModel()).toBe('local-model');
  });

  it('runs test connection and updates testResult', async () => {
    spyOn(aiService, 'testConnection').and.resolveTo({
      ok: true,
      message: 'Connection successful',
      models: ['mistral:7b', 'llama3.2:latest'],
    });

    await component.runTestConnection();

    expect(component.testResult()?.ok).toBeTrue();
    expect(component.testResult()?.models).toEqual(['mistral:7b', 'llama3.2:latest']);
    expect(component.localModel()).toBe('mistral:7b');
  });

  it('saves config and invokes close callback', async () => {
    const updateSpy = spyOn(aiService, 'updateConfig').and.resolveTo();
    const closeSpy = jasmine.createSpy('close');

    component.provider.set('local-openai');
    component.localEndpoint.set('http://localhost:8080/v1');
    component.localModel.set('custom-model');

    await component.saveAndClose(closeSpy);

    expect(updateSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        provider: 'local-openai',
        localEndpoint: 'http://localhost:8080/v1',
        localModel: 'custom-model',
      }),
    );
    expect(closeSpy).toHaveBeenCalled();
  });
});
