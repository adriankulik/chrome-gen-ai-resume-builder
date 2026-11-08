import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { AiService } from '../core/ai.service';

export type LozengeStatus = 'ok' | 'warn' | 'muted';

/**
 * Reusable AI status badge / lozenge component.
 * Displays the currently active AI provider (e.g. "Gemini Nano", "Ollama", "Local matching")
 * with a live status indicator dot and matching button height (28px).
 *
 * Usage:
 *   <app-ai-lozenge (openSettings)="aiSettingsOpen.set(true)" />
 */
@Component({
  selector: 'app-ai-lozenge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-lozenge.component.html',
  styleUrl: './ai-lozenge.component.scss',
})
export class AiLozengeComponent {
  readonly ai = inject(AiService);

  readonly openSettings = output<void>();

  readonly status = computed<LozengeStatus>(() => {
    const avail = this.ai.availability();
    if (avail === 'available') return 'ok';
    if (avail === 'downloading' || avail === 'downloadable') return 'warn';
    return 'muted';
  });

  readonly label = computed<string>(() => {
    const avail = this.ai.availability();
    if (avail === 'downloading') {
      const prog = this.ai.downloadProgress();
      return prog !== null ? `Downloading… ${(prog * 100).toFixed(0)}%` : 'Downloading…';
    }
    if (avail === 'downloadable') {
      return 'Downloadable';
    }
    return this.ai.activeProviderLabel();
  });

  readonly tooltip = computed<string>(() => {
    const avail = this.ai.availability();
    if (avail === 'available') {
      return `Click to configure AI engine — ${this.ai.activeProviderLabel()} active`;
    }
    if (avail === 'downloading') {
      return 'Downloading Chrome built-in AI model — click to configure';
    }
    if (avail === 'downloadable') {
      return 'Chrome AI model is downloadable — click to configure';
    }
    return 'Using local keyword matching — click to connect Ollama/LM Studio';
  });

  handleClick(): void {
    this.openSettings.emit();
  }
}
