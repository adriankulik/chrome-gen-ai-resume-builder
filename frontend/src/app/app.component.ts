import { Component, OnInit, inject, signal } from '@angular/core';
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
import { AiLozengeComponent } from './ai-lozenge/ai-lozenge.component';

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
    AiLozengeComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
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
    { id: 'vault', label: '2. Vault' },
    { id: 'preview', label: '3. Preview' },
  ];

  ngOnInit(): void {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'triage' || tabParam === 'vault' || tabParam === 'preview') {
        this.layout.setActiveTab(tabParam);
      }

      if (params.has('print')) {
        this.layout.setActiveTab('preview');
        // Wait for preview stage and font rendering to stabilize before printing
        setTimeout(() => {
          this.ext.exportPdf(this.vs.vault().contact.fullName);
          if (typeof window !== 'undefined') {
            window.addEventListener(
              'afterprint',
              () => {
                window.close();
              },
              { once: true },
            );
          }
        }, 500);
      }
    } catch {
      // URL parsing fallback
    }
  }
}
