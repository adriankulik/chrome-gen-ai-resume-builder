import { TestBed } from '@angular/core/testing';
import { AiLozengeComponent } from './ai-lozenge.component';
import { AiService } from '../core/ai.service';
import { StorageService } from '../core/storage.service';

describe('AiLozengeComponent', () => {
  let aiService: AiService;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [AiLozengeComponent],
      providers: [AiService, StorageService],
    }).compileComponents();

    aiService = TestBed.inject(AiService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders lozenge with muted status and Local matching initially', async () => {
    await aiService.refreshAvailability();
    const fixture = TestBed.createComponent(AiLozengeComponent);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.ai-lozenge') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.classList.contains('ai-lozenge--muted')).toBeTrue();
    expect(btn.textContent).toContain('Local matching');
  });

  it('renders Gemini Nano and ok status when Chrome Nano is available', () => {
    aiService.availability.set('available');
    aiService.activeProviderLabel.set('Gemini Nano');

    const fixture = TestBed.createComponent(AiLozengeComponent);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.ai-lozenge') as HTMLButtonElement;
    expect(btn.classList.contains('ai-lozenge--ok')).toBeTrue();
    expect(btn.textContent).toContain('Gemini Nano');
  });

  it('emits openSettings when clicked', () => {
    const fixture = TestBed.createComponent(AiLozengeComponent);
    const component = fixture.componentInstance;
    const spy = jasmine.createSpy('openSettings');
    component.openSettings.subscribe(spy);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.ai-lozenge') as HTMLButtonElement;
    btn.click();

    expect(spy).toHaveBeenCalled();
  });
});
