import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { VaultService } from './core/vault.service';

describe('AppComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders onboarding when onboarding is not complete', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const vs = TestBed.inject(VaultService);
    vs.onboarded.set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-onboarding')).toBeTruthy();
    expect(el.querySelector('.ai-lozenge')).toBeTruthy();
  });

  it('renders the panels and resume preview when onboarded', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const vs = TestBed.inject(VaultService);
    vs.completeOnboarding();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-vault-editor')).toBeTruthy();
    expect(el.querySelector('app-triage')).toBeTruthy();
    expect(el.querySelector('app-preview article.sheet h1')?.textContent).toContain('Jan Kowalski');
  });
});
