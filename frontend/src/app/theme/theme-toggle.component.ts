import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './theme-toggle.component.html',
})
export class ThemeToggleComponent {
  private readonly themeService = inject(ThemeService);

  /** Icon that represents the theme the user would switch *to*. */
  readonly nextIcon = computed(() =>
    this.themeService.theme() === 'dark' ? LucideSun.icon : LucideMoon.icon,
  );

  readonly nextLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'light' : 'dark',
  );

  /** aria-pressed reflects whether dark mode is currently active. */
  readonly isDark = computed(() => this.themeService.theme() === 'dark');

  toggle(): void { this.themeService.toggle(); }
}
