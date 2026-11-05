import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideSparkles, LucideCheck, LucideArrowLeft, LucidePlus, LucideTrash2 } from '@lucide/angular';
import { VaultService } from '../core/vault.service';
import { AiService } from '../core/ai.service';
import { defaultVault } from '../core/default-vault';
import { MasterVault } from '../core/vault.model';

type OnboardingStep = 'paste' | 'review';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent {
  readonly vs = inject(VaultService);
  readonly ai = inject(AiService);

  readonly step = signal<OnboardingStep>('paste');
  readonly rawText = signal('');
  readonly parsing = signal(false);
  readonly error = signal('');

  // Local draft vault during review
  readonly draft = signal<MasterVault>(structuredClone(this.vs.vault()));

  readonly sparklesIcon = LucideSparkles.icon;
  readonly checkIcon = LucideCheck.icon;
  readonly backIcon = LucideArrowLeft.icon;
  readonly plusIcon = LucidePlus.icon;
  readonly trashIcon = LucideTrash2.icon;

  async parse(): Promise<void> {
    const text = this.rawText().trim();
    if (!text) {
      this.error.set('Please paste your resume or work history text first.');
      return;
    }
    this.parsing.set(true);
    this.error.set('');
    try {
      const parsed = await this.ai.parseResume(text, this.vs.vault());
      this.draft.set(parsed);
      this.step.set('review');
    } catch (e) {
      console.warn(e);
      this.error.set('Extraction failed. You can load sample profile or try pasting again.');
    } finally {
      this.parsing.set(false);
    }
  }

  loadSample(): void {
    this.draft.set(defaultVault());
    this.step.set('review');
  }

  backToPaste(): void {
    this.step.set('paste');
  }

  addBullet(expIndex: number): void {
    this.draft.update((v) => {
      const copy = structuredClone(v);
      const exp = copy.experience[expIndex];
      if (exp) {
        exp.bullets.push({
          id: `b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          text: '',
        });
      }
      return copy;
    });
  }

  removeBullet(expIndex: number, bulletIndex: number): void {
    this.draft.update((v) => {
      const copy = structuredClone(v);
      const exp = copy.experience[expIndex];
      if (exp) {
        exp.bullets.splice(bulletIndex, 1);
      }
      return copy;
    });
  }

  setSkills(value: string): void {
    this.draft.update((v) => {
      const copy = structuredClone(v);
      copy.skills = value.split(',').map((s) => s.trim()).filter(Boolean);
      return copy;
    });
  }

  saveAndProceed(): void {
    this.vs.setVault(this.draft(), true);
    this.vs.completeOnboarding();
  }
}
