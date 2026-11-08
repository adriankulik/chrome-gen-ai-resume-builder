import { TestBed } from '@angular/core/testing';
import { LayoutService } from './layout.service';

describe('LayoutService', () => {
  afterEach(() => {
    localStorage.removeItem('ats-resume-builder:ui-vault-collapsed');
    localStorage.removeItem('ats-resume-builder:ui-triage-collapsed');
  });

  it('toggles and persists the vault collapsed state', async () => {
    const l = TestBed.inject(LayoutService);
    expect(l.vaultCollapsed()).toBeFalse();
    l.toggleVault();
    expect(l.vaultCollapsed()).toBeTrue();
    await new Promise((r) => setTimeout(r, 10));
    expect(localStorage.getItem('ats-resume-builder:ui-vault-collapsed')).toBe('true');
    l.setVaultCollapsed(false);
    expect(l.vaultCollapsed()).toBeFalse();
  });

  it('toggles and persists the triage collapsed state', async () => {
    const l = TestBed.inject(LayoutService);
    expect(l.triageCollapsed()).toBeFalse();
    l.toggleTriage();
    expect(l.triageCollapsed()).toBeTrue();
    await new Promise((r) => setTimeout(r, 10));
    expect(localStorage.getItem('ats-resume-builder:ui-triage-collapsed')).toBe('true');
    l.setTriageCollapsed(false);
    expect(l.triageCollapsed()).toBeFalse();
  });

  it('switches active tabs', () => {
    const l = TestBed.inject(LayoutService);
    expect(l.activeTab()).toBe('vault');
    l.setActiveTab('triage');
    expect(l.activeTab()).toBe('triage');
    l.setActiveTab('preview');
    expect(l.activeTab()).toBe('preview');
  });
});
