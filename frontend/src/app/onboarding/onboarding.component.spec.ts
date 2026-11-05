import { TestBed } from '@angular/core/testing';
import { OnboardingComponent } from './onboarding.component';
import { VaultService } from '../core/vault.service';

describe('OnboardingComponent', () => {
  it('starts at paste step and advances to review upon parsing', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    expect(comp.step()).toBe('paste');

    comp.rawText.set('Alice Smith\nalice@example.com\n\nExperience\nDeveloper - Startup (2021 - Present)\n- Built apps');
    await comp.parse();

    expect(comp.step()).toBe('review');
    expect(comp.draft().contact.fullName).toBe('Alice Smith');
  });

  it('loads sample profile and transitions to review', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    fixture.detectChanges();

    comp.loadSample();
    expect(comp.step()).toBe('review');
    expect(comp.draft().contact.fullName).toBe('Jan Kowalski');
  });

  it('completes onboarding when saved', async () => {
    await TestBed.configureTestingModule({ imports: [OnboardingComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OnboardingComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    fixture.detectChanges();

    comp.loadSample();
    comp.saveAndProceed();

    expect(vs.onboarded()).toBeTrue();
  });
});
