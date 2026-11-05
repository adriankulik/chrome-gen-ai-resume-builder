import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StorageService } from '../core/storage.service';
import { VaultService } from '../core/vault.service';
import { AiService } from '../core/ai.service';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';
import { CollapsibleComponent } from '../collapsible/collapsible.component';
import { LucideChevronsLeft, LucideX } from '@lucide/angular';
import { LayoutService } from '../core/layout.service';

export type EditorDialog = 'backup' | 'summary' | 'experience' | 'education' | 'skills';

const MAX_PHOTO_PX = 400;
const RAW_KEY = 'raw-resume-text';

@Component({
  selector: 'app-vault-editor',
  standalone: true,
  imports: [FormsModule, ModalComponent, ButtonComponent, CollapsibleComponent],
  templateUrl: './vault-editor.component.html',
})
export class VaultEditorComponent {
  readonly vs = inject(VaultService);
  readonly ai = inject(AiService);
  private readonly storage = inject(StorageService);
  readonly layout = inject(LayoutService);
  readonly collapseIcon = LucideChevronsLeft.icon;

  readonly dialog = signal<EditorDialog | null>(null);
  readonly removeIcon = LucideX.icon;
  readonly parseOpen = signal(this.vs.pristine());
  /** Pasted resume text; persisted (localStorage) until it has been parsed into the vault. */
  readonly rawText = signal('');
  readonly message = signal<{ kind: 'ok' | 'error'; text: string } | null>(null);
  readonly parsing = signal(false);
  private readonly importInput = viewChild<ElementRef<HTMLInputElement>>('importInput');

  constructor() {
    this.storage.get<string>(RAW_KEY).then((t) => {
      if (t && !this.rawText()) this.rawText.set(t);
    });
  }

  setRawText(value: string): void {
    this.rawText.set(value);
    this.storage.set(RAW_KEY, value).catch(() => undefined);
  }

  setLinks(value: string): void {
    this.vs.vault().contact.links = value.split(',').map((s) => s.trim()).filter(Boolean);
    this.vs.touch();
  }

  setSkills(value: string): void {
    this.vs.vault().skills = value.split(',').map((s) => s.trim()).filter(Boolean);
    this.vs.tailoredSkills.set(null);
    this.vs.touch();
  }

  setSummary(value: string): void {
    this.vs.vault().summary = value;
    this.vs.tailoredSummary.set(null);
    this.vs.touch();
  }

  get bulletCount(): number {
    return this.vs.vault().experience.reduce((n, e) => n + e.bullets.length, 0);
  }

  async onPhoto(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const dataUrl = await this.readAsDataUrl(file);
      this.vs.vault().contact.photoDataUrl = await this.downscale(dataUrl);
      this.vs.touch();
    } catch {
      this.flash('error', 'Could not read that image.');
    }
  }

  removePhoto(): void {
    this.vs.vault().contact.photoDataUrl = '';
    this.vs.touch();
  }

  private readAsDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(r.error);
      r.readAsDataURL(file);
    });
  }

  /** Shrinks big photos so the vault stays small; falls back to the original on failure. */
  private downscale(dataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_PX / Math.max(img.width, img.height));
        if (scale === 1 && dataUrl.length < 300_000) return resolve(dataUrl);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  async parseRaw(): Promise<void> {
    const text = this.rawText().trim();
    if (!text) return;
    this.parsing.set(true);
    try {
      const v = await this.ai.parseResume(text, this.vs.vault());
      this.vs.setVault(v, true);
      this.rawText.set('');
      this.parseOpen.set(false);
      this.storage.delete(RAW_KEY).catch(() => undefined);
      this.flash('ok', 'Resume parsed. Please review every field.');
    } catch (e) {
      console.warn(e);
      this.flash('error', 'AI parsing failed. Check that Chrome built-in AI is available, or enter data manually.');
    } finally {
      this.parsing.set(false);
    }
  }

  exportVault(): void {
    const blob = new Blob([this.vs.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-vault.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async importVault(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.vs.importJson(await file.text());
      this.flash('ok', 'Vault imported.');
    } catch {
      this.flash('error', 'Invalid vault file.');
    }
  }

  triggerImport(): void {
    this.importInput()?.nativeElement.click();
  }

  private flash(kind: 'ok' | 'error', text: string): void {
    this.message.set({ kind, text });
    setTimeout(() => this.message.set(null), 6000);
  }
}
