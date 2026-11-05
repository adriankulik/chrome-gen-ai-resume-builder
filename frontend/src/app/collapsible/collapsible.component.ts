import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { LucideChevronDown, LucideDynamicIcon } from '@lucide/angular';

let nextId = 0;

/**
 * Card with a clickable heading that expands/collapses its content.
 *
 *   <app-collapsible title="Bullet triage" badge="5 selected" [(open)]="open">…</app-collapsible>
 */
@Component({
  selector: 'app-collapsible',
  standalone: true,
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './collapsible.component.html',
  styleUrl: './collapsible.component.scss',
})
export class CollapsibleComponent {
  readonly title = input.required<string>();
  /** Small mono caption shown next to the title (e.g. a count). */
  readonly badge = input('');
  readonly badgeWarn = input(false);
  readonly open = model(true);

  protected readonly uid = `collapsible-${nextId++}`;
  protected readonly chevron = LucideChevronDown.icon;
}
