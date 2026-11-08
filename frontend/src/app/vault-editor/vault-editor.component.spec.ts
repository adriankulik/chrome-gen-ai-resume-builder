import { TestBed } from '@angular/core/testing';
import { VaultEditorComponent } from './vault-editor.component';
import { VaultService } from '../core/vault.service';

describe('VaultEditorComponent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('creates and can trigger clearAllData', async () => {
    await TestBed.configureTestingModule({ imports: [VaultEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VaultEditorComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    await vs.ready;
    vs.completeOnboarding();
    expect(vs.onboarded()).toBeTrue();

    await comp.executeClearAll();
    expect(vs.onboarded()).toBeFalse();
    expect(comp.dialog()).toBeNull();
  });

  it('renders backup and collapse actions in vault-head__actions container', async () => {
    await TestBed.configureTestingModule({ imports: [VaultEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VaultEditorComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const actions = el.querySelector('.vault-head__actions');
    expect(actions).toBeTruthy();
    const buttons = actions?.querySelectorAll('button');
    expect(buttons?.length).toBe(2);
    expect(actions?.querySelector('.collapse-btn')).toBeTruthy();
  });
});
