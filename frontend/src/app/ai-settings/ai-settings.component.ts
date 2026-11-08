import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '../core/ai.service';
import {
  AiConfig,
  AiProviderType,
  COMMON_LOCAL_PRESETS,
} from '../core/ai/ai-provider.model';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-ai-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-settings.component.html',
  styleUrl: './ai-settings.component.scss',
})
export class AiSettingsComponent {
  readonly ai = inject(AiService);

  readonly presets = COMMON_LOCAL_PRESETS;

  // Local draft state initialized from current config
  readonly provider = signal<AiProviderType>(this.ai.config().provider);
  readonly localEndpoint = signal<string>(this.ai.config().localEndpoint);
  readonly localModel = signal<string>(this.ai.config().localModel);
  readonly localApiKey = signal<string>(this.ai.config().localApiKey || '');

  // Live test connection state
  readonly testing = signal<boolean>(false);
  readonly testResult = signal<{ ok: boolean; message: string; models: string[] } | null>(null);

  applyPreset(preset: (typeof COMMON_LOCAL_PRESETS)[number]): void {
    this.localEndpoint.set(preset.endpoint);
    this.localModel.set(preset.defaultModel);
    this.testResult.set(null);
  }

  async runTestConnection(): Promise<void> {
    this.testing.set(true);
    this.testResult.set(null);
    try {
      const result = await this.ai.testConnection(
        this.localEndpoint(),
        this.localApiKey() || undefined,
      );
      this.testResult.set(result);
      if (result.ok && result.models.length > 0 && !result.models.includes(this.localModel())) {
        // Offer or pick first discovered model if current is not in list
        this.localModel.set(result.models[0]);
      }
    } finally {
      this.testing.set(false);
    }
  }

  selectModel(model: string): void {
    this.localModel.set(model);
  }

  async saveAndClose(closeCallback: () => void): Promise<void> {
    const updated: Partial<AiConfig> = {
      provider: this.provider(),
      localEndpoint: this.localEndpoint().trim(),
      localModel: this.localModel().trim(),
      localApiKey: this.localApiKey().trim(),
    };
    await this.ai.updateConfig(updated);
    closeCallback();
  }
}
