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
});
