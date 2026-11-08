import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  computed,
  signal,
} from '@angular/core';
import { LucideDynamicIcon, LucideLoader2, type LucideIconData } from '@lucide/angular';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'close' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Reusable button. Attaches to native `<button>` (or `<a>`) via attribute
 * selector so consumers keep real button semantics — `(click)`, `disabled`,
 * `type`, `formAction`, focus management etc. all work out of the box.
 *
 * Variants: primary, secondary, ghost, close, danger.
 * Always pair `close` with `[iconLeading]="LucideX.icon"`, `[iconOnly]="true"` and an `aria-label`.
 *
 * Usage:
 *   <button app-button variant="primary" [iconLeading]="Send">Submit</button>
 *   <a app-button variant="ghost" href="/about" [iconTrailing]="ArrowRight">More</a>
 */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'button[app-button], a[app-button]',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
  host: {
    'class': 'app-button',
    '[class.app-button--primary]':   "variant === 'primary'",
    '[class.app-button--secondary]': "variant === 'secondary'",
    '[class.app-button--ghost]':     "variant === 'ghost'",
    '[class.app-button--close]':     "variant === 'close'",
    '[class.app-button--danger]':    "variant === 'danger'",
    '[class.app-button--sm]':        "size === 'sm'",
    '[class.app-button--md]':        "size === 'md'",
    '[class.app-button--lg]':        "size === 'lg'",
    '[class.app-button--icon-only]':          'iconOnly',
    '[class.app-button--icon-only-below-sm]': "iconOnlyBelow === 'sm'",
    '[class.app-button--icon-only-below-md]': "iconOnlyBelow === 'md'",
    '[class.app-button--full-width]':         'fullWidth',
    '[class.app-button--loading]':            'loading',
    '[attr.aria-busy]':                       "loading ? 'true' : null",
    '[attr.aria-disabled]':                   "loading ? 'true' : null",
    '[attr.disabled]':                        "loading ? '' : null",
  },
})
export class ButtonComponent implements OnChanges, OnDestroy {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';
  @Input() fullWidth = false;

  /** Lucide icon shown before the label (left in LTR). */
  @Input() iconLeading?: LucideIconData;

  /** Lucide icon shown after the label (right in LTR). */
  @Input() iconTrailing?: LucideIconData;

  /** When true, hides the slotted label and renders a square icon button. */
  @Input() iconOnly = false;

  /** Collapses to icon-only below this breakpoint via CSS. The button stays in the DOM. */
  @Input() iconOnlyBelow?: 'sm' | 'md';

  /** When true, displays spinner and cycles interactive loading messages. */
  @Input() loading = false;

  /** Static fallback text when loading and no message list is provided. */
  @Input() loadingText?: string;

  /** Dynamic sequence of informative messages rotated while loading (e.g. every 5 seconds). */
  @Input() loadingMessages: string[] = [];

  /** Milliseconds between rotating loading messages. Defaults to 5000ms. */
  @Input() loadingIntervalMs = 5000;

  readonly spinnerIcon = LucideLoader2.icon;
  readonly messageIndex = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  readonly currentLoadingMessage = computed(() => {
    if (!this.loading) return '';
    const msgs = this.loadingMessages;
    if (msgs && msgs.length > 0) {
      return msgs[this.messageIndex() % msgs.length];
    }
    if (this.loadingText) {
      return this.loadingText;
    }
    const defaultMessages = [
      'Processing on-device…',
      'Thinking with local AI…',
      'Matching criteria, almost there…',
      'Keeping everything 100% private…',
    ];
    return defaultMessages[this.messageIndex() % defaultMessages.length];
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading']) {
      if (this.loading) {
        this.startLoadingRotation();
      } else {
        this.stopLoadingRotation();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopLoadingRotation();
  }

  private startLoadingRotation(): void {
    this.stopLoadingRotation();
    this.messageIndex.set(0);
    this.timer = setInterval(() => {
      this.messageIndex.update((i) => i + 1);
    }, this.loadingIntervalMs);
  }

  private stopLoadingRotation(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.messageIndex.set(0);
  }

  get iconPx(): number {
    if (this.size === 'lg') return 18;
    if (this.size === 'sm') return 14;
    return 16;
  }
}
