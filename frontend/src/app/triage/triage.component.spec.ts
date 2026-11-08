import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriageComponent } from './triage.component';
import { VaultService } from '../core/vault.service';
import { ExtensionService } from '../core/extension.service';
import { LayoutService } from '../core/layout.service';
import { AiService } from '../core/ai.service';

describe('TriageComponent', () => {
  let component: TriageComponent;
  let fixture: ComponentFixture<TriageComponent>;
  let vaultService: VaultService;
  let layoutService: LayoutService;
  let extensionService: ExtensionService;
  let aiService: AiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TriageComponent);
    component = fixture.componentInstance;
    vaultService = TestBed.inject(VaultService);
    layoutService = TestBed.inject(LayoutService);
    extensionService = TestBed.inject(ExtensionService);
    aiService = TestBed.inject(AiService);
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

  it('toggles profileStripCollapsed on small screen or collapses triage on desktop', () => {
    const collapseSpy = spyOn(layoutService, 'setTriageCollapsed');
    // Test small screen toggle
    component.profileStripCollapsed.set(false);
    component.collapsePanel();
    // On karma test environment window.innerWidth may be <= 1100px or > 1100px
    if (window.innerWidth <= 1100) {
      expect(component.profileStripCollapsed()).toBeTrue();
    } else {
      expect(collapseSpy).toHaveBeenCalledWith(true);
    }
  });

  it('extracts directly when user highlighted text', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo({
      text: 'Senior Rust Developer',
      isUserSelection: true,
    });
    const distillSpy = spyOn(aiService, 'distillJobDescription');

    await component.extractFromActiveTab();

    expect(component.jd()).toBe('Senior Rust Developer');
    expect(component.showManualInput()).toBeTrue();
    expect(distillSpy).not.toHaveBeenCalled();
  });

  it('distills job description with AI when page content is extracted and AI is available', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo({
      text: 'Header Nav\nStaff Engineer at Acme Corp\nBuild distributed systems\nFooter',
      isUserSelection: false,
    });
    spyOn(aiService, 'resolveActiveProvider').and.resolveTo({
      id: 'chrome-nano',
      name: 'Mock Provider',
      isAvailable: async () => true,
      generateJson: async <T>() => ({} as unknown as T),
    });
    spyOn(aiService, 'distillJobDescription').and.resolveTo({
      title: 'Staff Engineer',
      company: 'Acme Corp',
      description: 'Staff Engineer at Acme Corp. Build distributed systems.',
    });

    await component.extractFromActiveTab();

    expect(component.jd()).toBe('Staff Engineer at Acme Corp. Build distributed systems.');
    expect(component.showManualInput()).toBeTrue();
  });

  it('sets error message when extraction fails', async () => {
    spyOn(extensionService, 'extractFromActiveTab').and.resolveTo(null);

    await component.extractFromActiveTab();

    expect(component.error()).toContain('Could not extract job description');
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
