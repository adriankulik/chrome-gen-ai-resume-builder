import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { LucideCpu, LucideExternalLink, LucideLayers, LucideShieldCheck } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  readonly closed = output<void>();

  readonly externalIcon = LucideExternalLink.icon;
  readonly shieldIcon = LucideShieldCheck.icon;
  readonly cpuIcon = LucideCpu.icon;
  readonly layersIcon = LucideLayers.icon;
}
