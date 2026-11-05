import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Switch with label + optional description, laid out as a settings row
 * (text left, switch right). Uses a real <button role="switch"> for keyboard and screen readers.
 *
 *   <app-toggle label="Show photo" description="Profile picture in the header" [(checked)]="show" />
 */
@Component({
  selector: 'app-toggle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle.component.html',
  styleUrl: './toggle.component.scss',
})
export class ToggleComponent {
  readonly label = input.required<string>();
  readonly description = input('');
  readonly disabled = input(false);
  readonly checked = model(false);

  protected flip(): void {
    if (!this.disabled()) this.checked.update((c) => !c);
  }
}
