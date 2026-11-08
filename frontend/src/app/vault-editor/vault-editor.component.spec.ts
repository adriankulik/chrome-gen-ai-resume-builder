import { TestBed } from '@angular/core/testing';
import { VaultEditorComponent } from './vault-editor.component';
import { VaultService } from '../core/vault.service';
import { LayoutService } from '../core/layout.service';

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

  it('renders continue and backup actions in vault-head__actions container without collapse chevrons', async () => {
    await TestBed.configureTestingModule({ imports: [VaultEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VaultEditorComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const actions = el.querySelector('.vault-head__actions');
    expect(actions).toBeTruthy();
    const buttons = actions?.querySelectorAll('button');
    expect(buttons?.length).toBe(2);
    expect(actions?.querySelector('.collapse-btn')).toBeFalsy();
    expect(el.textContent).toContain('Continue to Job Match');
  });

  it('switches layout to triage tab and uncollapses triage on continueToJobMatch', async () => {
    await TestBed.configureTestingModule({ imports: [VaultEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VaultEditorComponent);
    const comp = fixture.componentInstance;
    const layout = TestBed.inject(LayoutService);
    const tabSpy = spyOn(layout, 'setActiveTab');
    const collapseSpy = spyOn(layout, 'setTriageCollapsed');

    comp.continueToJobMatch();
    expect(tabSpy).toHaveBeenCalledWith('triage');
    expect(collapseSpy).toHaveBeenCalledWith(false);
  });
});
