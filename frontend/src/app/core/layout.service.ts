import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';

const VAULT_KEY = 'ui-vault-collapsed';
const TRIAGE_KEY = 'ui-triage-collapsed';

export type WorkspaceTab = 'vault' | 'triage' | 'preview';

/** Workspace layout state. Panels 1 & 2 can collapse to slim rails. */
@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly storage = inject(StorageService);

  readonly vaultCollapsed = signal(false);
  readonly triageCollapsed = signal(false);
  readonly activeTab = signal<WorkspaceTab>('vault');

  setActiveTab(tab: WorkspaceTab): void {
    this.activeTab.set(tab);
  }

  constructor() {
    this.storage.get<boolean>(VAULT_KEY).then((v) => {
      if (typeof v === 'boolean') this.vaultCollapsed.set(v);
    });
    this.storage.get<boolean>(TRIAGE_KEY).then((v) => {
      if (typeof v === 'boolean') this.triageCollapsed.set(v);
    });
  }

  setVaultCollapsed(collapsed: boolean): void {
    this.vaultCollapsed.set(collapsed);
    this.storage.set(VAULT_KEY, collapsed).catch(() => undefined);
  }

  toggleVault(): void {
    this.setVaultCollapsed(!this.vaultCollapsed());
  }

  setTriageCollapsed(collapsed: boolean): void {
    this.triageCollapsed.set(collapsed);
    this.storage.set(TRIAGE_KEY, collapsed).catch(() => undefined);
  }

  toggleTriage(): void {
    this.setTriageCollapsed(!this.triageCollapsed());
  }
}
