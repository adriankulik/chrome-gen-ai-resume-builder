import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriageComponent } from './triage.component';
import { VaultService } from '../core/vault.service';
import { ExtensionService } from '../core/extension.service';
import { LayoutService } from '../core/layout.service';

describe('TriageComponent', () => {
  let component: TriageComponent;
  let fixture: ComponentFixture<TriageComponent>;
  let vaultService: VaultService;
  let layoutService: LayoutService;
  let extensionService: ExtensionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TriageComponent);
    component = fixture.componentInstance;
    vaultService = TestBed.inject(VaultService);
    layoutService = TestBed.inject(LayoutService);
    extensionService = TestBed.inject(ExtensionService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts in hero state with manualMode false', () => {
    expect(component.manualMode()).toBeFalse();
    expect(component.matches().length).toBe(0);
    expect(component.analyzing()).toBeFalse();
  });

  it('toggles manual input textarea', () => {
    expect(component.showManualInput()).toBeFalse();
    component.toggleManualInput();
    expect(component.showManualInput()).toBeTrue();
    component.toggleManualInput();
    expect(component.showManualInput()).toBeFalse();
  });

  it('enters manual mode when continueManually is called without JD', () => {
    component.continueManually();
    expect(component.manualMode()).toBeTrue();
    expect(vaultService.selectedBulletIds().size).toBeGreaterThan(0);
  });

  it('extracts keywords but preserves vault summary and bullets when continueManually is called with JD', () => {
    const originalSummary = vaultService.vault().summary;
    component.jd.set('Senior Angular engineer skilled in TypeScript and frontend architecture');
    component.continueManually();

    expect(component.manualMode()).toBeTrue();
    expect(component.keywords().length).toBeGreaterThan(0);
    expect(component.source()).toBe('fallback');
    // Summary was not overwritten by generative AI
    expect(vaultService.tailoredSummary()).toBeNull();
    expect(vaultService.vault().summary).toBe(originalSummary);
  });

  it('switches layout tab to preview and invokes ext.exportPdf when exportPdf is clicked', () => {
    const layoutSpy = spyOn(layoutService, 'setActiveTab');
    const extSpy = spyOn(extensionService, 'exportPdf');

    component.exportPdf();

    expect(layoutSpy).toHaveBeenCalledWith('preview');
    expect(extSpy).toHaveBeenCalledWith(vaultService.vault().contact.fullName);
  });

  it('switches layout tab to vault when editProfile is called', () => {
    const layoutSpy = spyOn(layoutService, 'setActiveTab');
    component.editProfile();
    expect(layoutSpy).toHaveBeenCalledWith('vault');
  });

  it('resets job and manual mode on resetJob', () => {
    component.jd.set('Some job');
    component.continueManually();
    expect(component.manualMode()).toBeTrue();

    component.resetJob();
    expect(component.jd()).toBe('');
    expect(component.keywords()).toEqual([]);
    expect(component.manualMode()).toBeFalse();
    expect(component.source()).toBeNull();
    expect(vaultService.tailoredSummary()).toBeNull();
  });
});
