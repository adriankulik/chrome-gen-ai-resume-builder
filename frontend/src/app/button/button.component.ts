import {
  ChangeDetectionStrategy,
  Component,
  Input,
} from '@angular/core';
import { LucideDynamicIcon, type LucideIconData } from '@lucide/angular';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'close';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Reusable button. Attaches to native `<button>` (or `<a>`) via attribute
 * selector so consumers keep real button semantics — `(click)`, `disabled`,
 * `type`, `formAction`, focus management etc. all work out of the box.
 *
 * Variants: primary, secondary, ghost, and `close` — a round, icon-only
 * dismiss/remove button (X). Always pair `close` with `[iconLeading]="LucideX.icon"`,
 * `[iconOnly]="true"` and an `aria-label`.
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
    '[class.app-button--sm]':        "size === 'sm'",
    '[class.app-button--md]':        "size === 'md'",
    '[class.app-button--lg]':        "size === 'lg'",
    '[class.app-button--icon-only]':          'iconOnly',
    '[class.app-button--icon-only-below-sm]': "iconOnlyBelow === 'sm'",
    '[class.app-button--icon-only-below-md]': "iconOnlyBelow === 'md'",
  },
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() size: ButtonSize = 'md';

  /** Lucide icon shown before the label (left in LTR). */
  @Input() iconLeading?: LucideIconData;

  /** Lucide icon shown after the label (right in LTR). */
  @Input() iconTrailing?: LucideIconData;

  /** When true, hides the slotted label and renders a square icon button. */
  @Input() iconOnly = false;

  /** Collapses to icon-only below this breakpoint via CSS. The button stays in the DOM. */
  @Input() iconOnlyBelow?: 'sm' | 'md';

  get iconPx(): number {
    if (this.size === 'lg') return 18;
    if (this.size === 'sm') return 14;
    return 16;
  }
}
