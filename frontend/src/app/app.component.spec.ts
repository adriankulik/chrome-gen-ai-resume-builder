import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  it('renders the three panels and a resume preview', async () => {
    await TestBed.configureTestingModule({ imports: [AppComponent] }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('app-vault-editor')).toBeTruthy();
    expect(el.querySelector('app-triage')).toBeTruthy();
    expect(el.querySelector('app-preview article.sheet h1')?.textContent).toContain('Jan Kowalski');
    expect(el.querySelector('.ai-lozenge')).toBeTruthy();
  });
});
