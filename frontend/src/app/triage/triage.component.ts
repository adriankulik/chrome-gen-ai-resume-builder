import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideEye,
  LucideFileDown,
  LucideRotateCcw,
  LucideZap,
} from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';
import { CollapsibleComponent } from '../collapsible/collapsible.component';
import { AiService } from '../core/ai.service';
import { ExtensionService } from '../core/extension.service';
import { LayoutService } from '../core/layout.service';
import { VaultService } from '../core/vault.service';
import { extractKeywords, normalize, textHasKeyword } from '../core/keyword-matcher';

export interface KeywordMatch {
  keyword: string;
  bullet: { id: string; text: string; role: string; company: string } | null;
  onResume: boolean;
  inSkills: boolean;
}

export const STRICT_BULLET_CAP = 14;
const MAX_SKILLS = 15;
const LOOSE_BULLET_CAP = 24;

@Component({
  selector: 'app-triage',
  standalone: true,
  imports: [FormsModule, CollapsibleComponent, ButtonComponent],
  templateUrl: './triage.component.html',
  styleUrl: './triage.component.scss',
})
export class TriageComponent {
  readonly vs = inject(VaultService);
  readonly ai = inject(AiService);
  readonly ext = inject(ExtensionService);
  readonly layout = inject(LayoutService);
  readonly exportIcon = LucideFileDown.icon;
  readonly previewIcon = LucideEye.icon;
  readonly zapIcon = LucideZap.icon;
  readonly resetIcon = LucideRotateCcw.icon;

  readonly triageOpen = signal(true);
  readonly jd = signal('');
  readonly keywords = signal<string[]>([]);
  readonly source = signal<'ai' | 'fallback' | null>(null);
  readonly analyzing = signal(false);
  readonly extracting = signal(false);
  readonly distilling = signal(false);
  readonly error = signal('');
  readonly showManualInput = signal(false);
  readonly manualMode = signal(false);

  readonly tailoringMessages = [
    'Reading job description…',
    'Matching ATS keywords on-device…',
    'Scoring your achievements…',
    'Selecting strongest bullets…',
    'Tailoring executive summary…',
    'Aligning core skills with job criteria…',
    'Polishing final recommendations…',
    'Almost ready — 100% private…',
  ];

  readonly extractingMessages = [
    'Extracting page from tab…',
    'Distilling job description with AI…',
    'Stripping web menus & boilerplate…',
    'Isolating key responsibilities…',
    'Almost ready for review…',
  ];

  readonly proposingMessages = [
    'Analyzing missing keywords…',
    'Drafting metric-driven achievement…',
    'Refining impact and phrasing…',
    'Almost done…',
  ];

  get bulletCount(): number {
    return this.vs.vault().experience.reduce((sum, e) => sum + e.bullets.length, 0);
  }

  editProfile(): void {
    this.layout.setActiveTab('vault');
  }

  viewPreview(): void {
    this.layout.setActiveTab('preview');
  }

  exportPdf(): void {
    this.layout.setActiveTab('preview');
    this.ext.exportPdf(this.vs.vault().contact.fullName);
  }

  resetJob(): void {
    this.jd.set('');
    this.keywords.set([]);
    this.source.set(null);
    this.manualMode.set(false);
    this.error.set('');
    this.proposals.set({});
    this.vs.tailoredSummary.set(null);
    this.vs.tailoredSkills.set(null);
    this.vs.selectAll();
  }

  continueManually(): void {
    const text = this.jd().trim();
    this.error.set('');
    this.manualMode.set(true);
    if (text) {
      // Heuristic keyword extraction from JD without AI rewriting bullets or summary
      const kws = extractKeywords(text, this.vs.vault());
      this.keywords.set(kws);
      this.source.set('fallback');
    }
    if (this.vs.selectedBulletIds().size === 0) {
      this.vs.selectAll();
    }
  }

  toggleManualInput(): void {
    this.showManualInput.update((v) => !v);
  }

  /** Editable proposals per role id. */
  readonly proposals = signal<Record<string, string[] | undefined>>({});
  readonly proposingFor = signal<string | null>(null);

  /**
   * 1:1 keyword ↔ bullet matching: each keyword claims the best bullet that mentions it
   * (preferring bullets that are on the resume), and a bullet is claimed by at most one keyword.
   */
  readonly matches = computed<KeywordMatch[]>(() => {
    const v = this.vs.vault();
    const selected = this.vs.selectedBulletIds();
    const skills = this.vs.tailoredSkills() ?? v.skills;
    const bullets = v.experience.flatMap((e) =>
      e.bullets.map((b) => ({ id: b.id, text: b.text, role: e.role, company: e.company })),
    );
    const used = new Set<string>();
    return this.keywords().map((keyword) => {
      const candidates = bullets.filter((b) => textHasKeyword(b.text, keyword));
      const pick =
        candidates.find((b) => selected.has(b.id) && !used.has(b.id)) ??
        candidates.find((b) => !used.has(b.id)) ??
        null;
      if (pick) used.add(pick.id);
      return {
        keyword,
        bullet: pick,
        onResume: !!pick && selected.has(pick.id),
        inSkills: skills.some((s) => textHasKeyword(s, keyword) || normalize(s) === normalize(keyword)),
      };
    });
  });
  readonly matchedCount = computed(() => this.matches().filter((m) => m.bullet || m.inSkills).length);
  /** Keywords with no supporting bullet — candidates for the bullet proposer. */
  readonly missing = computed(() => this.matches().filter((m) => !m.bullet).map((m) => m.keyword));
  readonly cap = computed(() => (this.vs.settings().strictOnePage ? STRICT_BULLET_CAP : LOOSE_BULLET_CAP));
  readonly selectedCount = computed(() => this.vs.selectedBulletIds().size);

  async analyze(): Promise<void> {
    const jd = this.jd().trim();
    if (!jd) return;
    this.analyzing.set(true);
    this.error.set('');
    try {
      const res = await this.ai.triage(this.vs.vault(), jd, this.cap());
      this.keywords.set(res.extractedKeywords);
      this.vs.setSelected(res.selectedBulletIds);
      this.vs.tailoredSummary.set(res.summary);
      this.vs.tailoredSkills.set(this.orderSkills(res.relevantSkills));
      this.source.set(res.source);
      if (!res.selectedBulletIds.length) {
        this.error.set('No matching bullets found — select bullets manually below.');
      }
    } catch (e) {
      console.warn(e);
      this.error.set('Analysis failed. Please try again.');
    } finally {
      this.analyzing.set(false);
    }
  }

  /** One-click extract from the active tab when running as a Chrome extension. */
  async extractFromActiveTab(): Promise<void> {
    this.extracting.set(true);
    this.distilling.set(false);
    this.error.set('');
    try {
      const result = await this.ext.extractFromActiveTab();
      if (result?.text) {
        let finalJobText = result.text;
        // If not explicitly highlighted by user and AI is available, distill the raw page text
        const provider = await this.ai.resolveActiveProvider();
        if (!result.isUserSelection && provider) {
          this.distilling.set(true);
          try {
            const distilled = await this.ai.distillJobDescription(result.text);
            if (distilled.description?.trim()) {
              finalJobText = distilled.description.trim();
            }
          } catch (err) {
            console.warn('Job distillation error, using raw page text:', err);
          } finally {
            this.distilling.set(false);
          }
        }
        this.jd.set(finalJobText);
        this.showManualInput.set(true);
      } else {
        this.error.set('Could not extract job description from active tab. Highlight the text or paste directly.');
      }
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Extraction failed.');
    } finally {
      this.extracting.set(false);
      this.distilling.set(false);
    }
  }

  /** Relevant skills first (validated against the vault), then the remaining vault skills. */
  private orderSkills(relevant: string[]): string[] {
    const all = this.vs.vault().skills;
    const byName = new Map(all.map((s) => [normalize(s), s]));
    const first = [...new Set(relevant.map((s) => byName.get(normalize(s))).filter((s): s is string => !!s))];
    const rest = all.filter((s) => !first.includes(s));
    return [...first, ...rest].slice(0, MAX_SKILLS);
  }

  setTailoredSkills(value: string): void {
    this.vs.tailoredSkills.set(value.split(',').map((s) => s.trim()).filter(Boolean));
  }

  onToggle(id: string, ev: Event): void {
    this.vs.toggleBullet(id, (ev.target as HTMLInputElement).checked);
  }

  async propose(expId: string): Promise<void> {
    this.proposingFor.set(expId);
    this.error.set('');
    try {
      const out = await this.ai.proposeBullets(this.vs.vault(), expId, this.jd(), this.missing());
      if (!out.length) this.error.set('The model returned no suggestions.');
      this.proposals.update((p) => ({ ...p, [expId]: out }));
    } catch (e) {
      console.warn(e);
      this.error.set('Could not generate suggestions (Chrome built-in AI required).');
    } finally {
      this.proposingFor.set(null);
    }
  }

  setProposal(expId: string, idx: number, text: string): void {
    this.proposals.update((p) => {
      const list = [...(p[expId] ?? [])];
      list[idx] = text;
      return { ...p, [expId]: list };
    });
  }

  acceptProposal(expId: string, idx: number): void {
    const text = (this.proposals()[expId] ?? [])[idx]?.trim();
    if (text) this.vs.addBullet(expId, text, true);
    this.dismissProposal(expId, idx);
  }

  dismissProposal(expId: string, idx: number): void {
    this.proposals.update((p) => ({ ...p, [expId]: (p[expId] ?? []).filter((_, i) => i !== idx) }));
  }
}
