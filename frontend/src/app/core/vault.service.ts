import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { MasterVault, normalizeVault, nextId, Experience } from './vault.model';
import { defaultVault } from './default-vault';

const VAULT_KEY = 'master-vault';
const ONBOARDED_KEY = 'ats-onboarding-completed';

@Injectable({ providedIn: 'root' })
export class VaultService {
  private readonly storage = inject(StorageService);

  readonly vault = signal<MasterVault>(defaultVault());
  readonly loaded = signal(false);
  /** True when the user has completed onboarding (pasted/reviewed their profile) or imported a vault. */
  readonly onboarded = signal(false);
  /** True until the user adds/edits/imports anything (or a saved vault is loaded). Shows onboarding. */
  readonly pristine = signal(true);
  /** IDs of bullets selected for the current resume (driven by triage). */
  readonly selectedBulletIds = signal<Set<string>>(new Set());

  /** Summary generated for the current job description; overrides the vault summary in the preview. */
  readonly tailoredSummary = signal<string | null>(null);
  /** Skills ordered/selected for the current job description; overrides the vault skills in the preview. */
  readonly tailoredSkills = signal<string[] | null>(null);

  readonly settings = computed(() => this.vault().settings);

  constructor() {
    this.init();
    effect(() => {
      const v = this.vault();
      if (this.loaded() && !this.pristine()) {
        this.storage.set(VAULT_KEY, v).catch((e) => console.warn('Vault save failed (storage full?)', e));
      }
    });
  }

  private async init(): Promise<void> {
    try {
      const isDone = await this.storage.get<boolean>(ONBOARDED_KEY);
      const saved = await this.storage.get<unknown>(VAULT_KEY);
      if (saved) {
        this.setVault(normalizeVault(saved), true);
        this.onboarded.set(isDone ?? true);
      } else {
        this.selectAll();
        this.onboarded.set(isDone ?? false);
      }
    } catch (e) {
      console.warn('Vault load failed, using sample data', e);
      this.selectAll();
      this.onboarded.set(false);
    }
    this.loaded.set(true);
  }

  completeOnboarding(): void {
    this.onboarded.set(true);
    this.storage.set(ONBOARDED_KEY, true).catch(() => undefined);
  }

  startOnboarding(): void {
    this.onboarded.set(false);
    this.storage.set(ONBOARDED_KEY, false).catch(() => undefined);
  }

  /** Signals an in-place mutation (e.g. via ngModel) so dependents refresh and the vault persists. */
  touch(): void {
    this.pristine.set(false);
    this.vault.update((v) => ({ ...v }));
  }

  update(fn: (draft: MasterVault) => void): void {
    const copy = structuredClone(this.vault());
    fn(copy);
    this.pristine.set(false);
    this.vault.set(copy);
  }

  /** Replace the vault; keeps selection only for IDs that still exist. */
  setVault(v: MasterVault, selectAllBullets = false): void {
    this.pristine.set(false);
    this.vault.set(v);
    if (selectAllBullets) this.selectAll();
    else {
      const ids = new Set(this.allBulletIds());
      this.selectedBulletIds.update((s) => new Set([...s].filter((i) => ids.has(i))));
    }
  }

  allBulletIds(): string[] {
    return this.vault().experience.flatMap((e) => e.bullets.map((b) => b.id));
  }

  selectAll(): void {
    this.selectedBulletIds.set(new Set(this.allBulletIds()));
  }

  setSelected(ids: Iterable<string>): void {
    this.selectedBulletIds.set(new Set(ids));
  }

  toggleBullet(id: string, on: boolean): void {
    this.selectedBulletIds.update((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  // --- CRUD helpers ---
  addExperience(): void {
    this.update((v) => {
      v.experience.push({
        id: nextId(v, 'exp'),
        role: '',
        company: '',
        startDate: '',
        endDate: '',
        bullets: [],
      });
    });
  }

  removeExperience(id: string): void {
    this.update((v) => (v.experience = v.experience.filter((e) => e.id !== id)));
    this.setVault(this.vault());
  }

  addBullet(expId: string, text = '', select = true): string {
    let newId = '';
    this.update((v) => {
      newId = nextId(v, 'b');
      v.experience.find((e) => e.id === expId)?.bullets.push({ id: newId, text });
    });
    if (select) this.toggleBullet(newId, true);
    return newId;
  }

  removeBullet(expId: string, bulletId: string): void {
    this.update((v) => {
      const e = v.experience.find((x) => x.id === expId);
      if (e) e.bullets = e.bullets.filter((b) => b.id !== bulletId);
    });
    this.toggleBullet(bulletId, false);
  }

  addEducation(): void {
    this.update((v) => v.education.push({ id: nextId(v, 'edu'), degree: '', institution: '', year: '' }));
  }

  removeEducation(id: string): void {
    this.update((v) => (v.education = v.education.filter((e) => e.id !== id)));
  }

  /** Experience filtered to selected bullets; roles with none are dropped. */
  selectedExperience = computed<Experience[]>(() => {
    const sel = this.selectedBulletIds();
    return this.vault()
      .experience.map((e) => ({ ...e, bullets: e.bullets.filter((b) => sel.has(b.id)) }))
      .filter((e) => e.bullets.length > 0);
  });

  // --- Backup ---
  exportJson(): string {
    return JSON.stringify(this.vault(), null, 2);
  }

  importJson(text: string): void {
    this.setVault(normalizeVault(JSON.parse(text)), true);
  }

  async clearStorage(): Promise<void> {
    await this.storage.delete(VAULT_KEY);
  }
}
