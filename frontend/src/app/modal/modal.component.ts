import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { ButtonComponent } from '../button/button.component';

/**
 * Reusable popup built on the native <dialog> element (focus trap, Esc to close, top layer).
 * Render it conditionally; it opens itself on creation and emits `closed` when dismissed.
 *
 *   @if (open()) {
 *     <app-modal title="Edit summary" (closed)="open.set(false)">…content…</app-modal>
 *   }
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent implements AfterViewInit {
  readonly title = input.required<string>();
  readonly closed = output<void>();

  protected readonly closeIcon = LucideX.icon;
  private readonly dlg = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  ngAfterViewInit(): void {
    const el = this.dlg().nativeElement;
    if (!el.open) el.showModal();
  }

  protected dismiss(): void {
    this.dlg().nativeElement.close();
  }

  /** Clicks on the ::backdrop target the <dialog> itself. */
  protected onBackdrop(ev: MouseEvent): void {
    if (ev.target === this.dlg().nativeElement) this.dismiss();
  }
}
