import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Reusable radio card option in the portfolio design language.
 * Formatted with a radio input on the left and title + description on the right.
 * Fully styled with semantic design tokens, dynamically adapting between dark and light themes.
 *
 * Usage:
 *   <app-radio-card
 *     label="Chrome Built-in AI"
 *     description="Runs on-device via Gemini Nano"
 *     value="chrome-nano"
 *     name="ai-engine"
 *     [(selectedValue)]="selectedEngine"
 *   />
 */
@Component({
  selector: 'app-radio-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radio-card.component.html',
  styleUrl: './radio-card.component.scss',
})
export class RadioCardComponent<T = string> {
  readonly label = input.required<string>();
  readonly description = input('');
  readonly value = input.required<T>();
  readonly name = input('radio-card-group');
  readonly disabled = input(false);
  readonly selectedValue = model.required<T>();

  protected isSelected(): boolean {
    return this.selectedValue() === this.value();
  }

  protected select(): void {
    if (!this.disabled()) {
      this.selectedValue.set(this.value());
    }
  }
}
