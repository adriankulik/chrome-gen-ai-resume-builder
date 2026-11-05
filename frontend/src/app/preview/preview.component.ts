import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CollapsibleComponent } from '../collapsible/collapsible.component';
import { DropdownComponent } from '../dropdown/dropdown.component';
import { ToggleComponent } from '../toggle/toggle.component';
import { VaultService } from '../core/vault.service';
import { THEMES, ThemeName, VaultSettings } from '../core/vault.model';

const MM_PX = 96 / 25.4;
const A4_W = 210 * MM_PX;
const A4_H = 297 * MM_PX;

@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [FormsModule, DropdownComponent, ToggleComponent, CollapsibleComponent],
  templateUrl: './preview.component.html',
})
export class PreviewComponent implements AfterViewInit, OnDestroy {
  readonly vs = inject(VaultService);
  readonly themes = THEMES;

  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');
  private readonly sheet = viewChild.required<ElementRef<HTMLElement>>('sheet');
  private ro?: ResizeObserver;

  readonly settingsOpen = signal(true);
  readonly scale = signal(1);
  readonly sheetHeight = signal(A4_H);
  readonly overflow = computed(() => this.sheetHeight() > A4_H + 1);

  readonly s = this.vs.settings;
  readonly showPhoto = computed(() => this.s().showPhoto && !!this.vs.vault().contact.photoDataUrl);

  readonly summary = computed(() => this.vs.tailoredSummary() ?? this.vs.vault().summary);
  readonly skills = computed(() => this.vs.tailoredSkills() ?? this.vs.vault().skills);

  /** Contact details split into primary communication info and web links */
  readonly primaryContact = computed(() => {
    const c = this.vs.vault().contact;
    return [c.email, c.phone, c.location].map((s) => s?.trim()).filter(Boolean);
  });

  readonly contactLinks = computed(() => {
    return (this.vs.vault().contact.links || [])
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => ({
        url: /^https?:\/\//i.test(l) ? l : `https://${l}`,
        display: l.replace(/^https?:\/\//i, '').replace(/\/$/, ''),
      }));
  });

  readonly rodoText = computed(() => {
    const company = this.s().rodoCompanyName.trim();
    const target = company ? ` by ${company}` : '';
    return (
      `I hereby consent to the processing of my personal data for the purposes of the recruitment process${target}, ` +
      'in accordance with Regulation (EU) 2016/679 of the European Parliament and of the Council of 27 April 2016 (GDPR).'
    );
  });

  ngAfterViewInit(): void {
    const update = () => {
      const w = this.stage().nativeElement.clientWidth;
      this.scale.set(Math.min(1, Math.max(0.3, (w - 8) / A4_W)));
      this.sheetHeight.set(this.sheet().nativeElement.offsetHeight);
    };
    this.ro = new ResizeObserver(() => queueMicrotask(update));
    this.ro.observe(this.stage().nativeElement);
    this.ro.observe(this.sheet().nativeElement);
    update();
  }

  ngOnDestroy(): void {
    this.ro?.disconnect();
  }

  set<K extends keyof VaultSettings>(key: K, value: VaultSettings[K]): void {
    this.vs.vault().settings[key] = value;
    this.vs.touch();
  }

  setTheme(v: ThemeName): void {
    this.set('theme', v);
  }

  /** "2022-03" → "03/2022"; other strings pass through. */
  fmt(d: string): string {
    const m = /^(\d{4})-(\d{2})$/.exec(d.trim());
    return m ? `${m[2]}/${m[1]}` : d;
  }

  print(): void {
    const prev = document.title;
    const name = this.vs.vault().contact.fullName.trim();
    document.title = name ? `${name} - Resume` : 'Resume';
    window.print();
    document.title = prev;
  }
}
