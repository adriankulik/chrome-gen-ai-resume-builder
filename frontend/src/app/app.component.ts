import { Component, inject, signal } from '@angular/core';
import { LucideChevronsRight } from '@lucide/angular';
import { ButtonComponent } from './button/button.component';
import { LayoutService, WorkspaceTab } from './core/layout.service';
import { AiService } from './core/ai.service';
import { ExtensionService } from './core/extension.service';
import { VaultService } from './core/vault.service';
import { VaultEditorComponent } from './vault-editor/vault-editor.component';
import { TriageComponent } from './triage/triage.component';
import { ThemeToggleComponent } from './theme/theme-toggle.component';
import { PreviewComponent } from './preview/preview.component';
import { OnboardingComponent } from './onboarding/onboarding.component';
import { ModalComponent } from './modal/modal.component';
import { AiSettingsComponent } from './ai-settings/ai-settings.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    VaultEditorComponent,
    TriageComponent,
    PreviewComponent,
    ThemeToggleComponent,
    ButtonComponent,
    OnboardingComponent,
    ModalComponent,
    AiSettingsComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly vs = inject(VaultService);
  readonly ai = inject(AiService);
  readonly ext = inject(ExtensionService);
  readonly layout = inject(LayoutService);
  readonly expandIcon = LucideChevronsRight.icon;
  readonly tab = this.layout.activeTab;
  readonly aiSettingsOpen = signal(false);

  readonly closeAiSettings = (): void => {
    this.aiSettingsOpen.set(false);
  };

  readonly tabs: { id: WorkspaceTab; label: string }[] = [
    { id: 'triage', label: '1. Job match' },
    { id: 'vault', label: '2. Vault & Edit' },
    { id: 'preview', label: '3. Preview' },
  ];
}
