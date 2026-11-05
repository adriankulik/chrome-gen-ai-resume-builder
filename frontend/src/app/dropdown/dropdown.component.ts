import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';
import { LucideCheck, LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
}

let nextId = 0;

/**
 * Select-style dropdown in the portfolio design language (pill trigger, elevated listbox).
 * Fully keyboard accessible (Arrow keys, Home/End, Enter/Space, Esc, type-ahead by first letter).
 *
 *   <app-dropdown label="Theme" [options]="themes" [(value)]="theme" />
 */
@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.scss',
})
export class DropdownComponent<T extends string = string> {
  readonly options = input.required<DropdownOption<T>[]>();
  readonly value = model.required<T>();
  /** Accessible name (also rendered as a small caption above the trigger when `showLabel`). */
  readonly label = input.required<string>();
  readonly showLabel = input(true);

  protected readonly uid = `dd-${nextId++}`;
  protected readonly open = signal(false);
  protected readonly active = signal(0);
  protected readonly chevron = LucideChevronDown.icon;
  protected readonly check = LucideCheck.icon;

  protected readonly selected = computed(() => this.options().find((o) => o.value === this.value()));

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(ev.target as Node)) this.open.set(false);
  }

  protected toggle(): void {
    if (this.open()) this.open.set(false);
    else this.openList();
  }

  private openList(): void {
    const i = this.options().findIndex((o) => o.value === this.value());
    this.active.set(Math.max(0, i));
    this.open.set(true);
  }

  protected choose(opt: DropdownOption<T>): void {
    this.value.set(opt.value);
    this.open.set(false);
  }

  protected onKeydown(ev: KeyboardEvent): void {
    const opts = this.options();
    const last = opts.length - 1;
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        ev.preventDefault();
        if (!this.open()) return this.openList();
        const d = ev.key === 'ArrowDown' ? 1 : -1;
        this.active.update((i) => Math.min(last, Math.max(0, i + d)));
        break;
      }
      case 'Home':
        if (this.open()) { ev.preventDefault(); this.active.set(0); }
        break;
      case 'End':
        if (this.open()) { ev.preventDefault(); this.active.set(last); }
        break;
      case 'Enter':
      case ' ':
        ev.preventDefault();
        if (this.open()) this.choose(opts[this.active()]);
        else this.openList();
        break;
      case 'Escape':
        if (this.open()) { ev.preventDefault(); ev.stopPropagation(); this.open.set(false); }
        break;
      case 'Tab':
        this.open.set(false);
        break;
      default:
        if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
          const i = opts.findIndex((o) => o.label.toLowerCase().startsWith(ev.key.toLowerCase()));
          if (i >= 0) {
            if (!this.open()) this.openList();
            this.active.set(i);
          }
        }
    }
  }
}
