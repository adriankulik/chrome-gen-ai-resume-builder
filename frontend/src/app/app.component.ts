import { Component, inject, signal } from '@angular/core';
import { LucideChevronsRight } from '@lucide/angular';
import { ButtonComponent } from './button/button.component';
import { LayoutService } from './core/layout.service';
import { AiService } from './core/ai.service';
import { VaultEditorComponent } from './vault-editor/vault-editor.component';
import { TriageComponent } from './triage/triage.component';
import { ThemeToggleComponent } from './theme/theme-toggle.component';
import { PreviewComponent } from './preview/preview.component';

type Tab = 'vault' | 'triage' | 'preview';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [VaultEditorComponent, TriageComponent, PreviewComponent, ThemeToggleComponent, ButtonComponent],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly ai = inject(AiService);
  readonly layout = inject(LayoutService);
  readonly expandIcon = LucideChevronsRight.icon;
  readonly tab = signal<Tab>('vault');
  readonly tabs: { id: Tab; label: string }[] = [
    { id: 'vault', label: '1. Vault' },
    { id: 'triage', label: '2. Job match' },
    { id: 'preview', label: '3. Preview' },
  ];
}
