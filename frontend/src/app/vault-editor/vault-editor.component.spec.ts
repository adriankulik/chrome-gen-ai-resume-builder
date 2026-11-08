import { TestBed } from '@angular/core/testing';
import { VaultEditorComponent } from './vault-editor.component';
import { VaultService } from '../core/vault.service';

describe('VaultEditorComponent', () => {
  it('creates and can trigger clearAllData', async () => {
    await TestBed.configureTestingModule({ imports: [VaultEditorComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VaultEditorComponent);
    const comp = fixture.componentInstance;
    const vs = TestBed.inject(VaultService);
    vs.completeOnboarding();
    expect(vs.onboarded()).toBeTrue();

    await comp.executeClearAll();
    expect(vs.onboarded()).toBeFalse();
    expect(comp.dialog()).toBeNull();
  });
});
