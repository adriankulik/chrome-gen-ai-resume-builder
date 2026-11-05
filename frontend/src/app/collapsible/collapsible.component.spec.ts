import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollapsibleComponent } from './collapsible.component';

@Component({
  standalone: true,
  imports: [CollapsibleComponent],
  template: `
    <app-collapsible [title]="title" [badge]="badge" [badgeWarn]="badgeWarn" [(open)]="isOpen">
      <p class="projected-content">Collapsible body text</p>
    </app-collapsible>
  `,
})
class TestHostComponent {
  title = 'Test Section';
  badge = '3 items';
  badgeWarn = false;
  isOpen = true;
}

describe('CollapsibleComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the title and badge', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.collapsible__title')?.textContent?.trim()).toBe('Test Section');
    expect(el.querySelector('.collapsible__badge')?.textContent?.trim()).toBe('3 items');
  });

  it('applies badge warn class when badgeWarn is true', () => {
    host.badgeWarn = true;
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.collapsible__badge');
    expect(badge?.classList).toContain('collapsible__badge--warn');
  });

  it('renders full-width divider line and projected body when open', () => {
    const el = fixture.nativeElement as HTMLElement;
    const divider = el.querySelector('.collapsible__divider');
    const body = el.querySelector('.collapsible__body');
    const content = el.querySelector('.projected-content');

    expect(divider).toBeTruthy();
    expect(body).toBeTruthy();
    expect(content?.textContent).toBe('Collapsible body text');

    const trigger = el.querySelector('.collapsible__trigger');
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggles open state and removes divider and body on click', () => {
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector<HTMLButtonElement>('.collapsible__trigger');
    expect(trigger).toBeTruthy();

    trigger?.click();
    fixture.detectChanges();

    expect(host.isOpen).toBeFalse();
    expect(el.querySelector('.collapsible__divider')).toBeNull();
    expect(el.querySelector('.collapsible__body')).toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('false');

    // Click again to re-open
    trigger?.click();
    fixture.detectChanges();

    expect(host.isOpen).toBeTrue();
    expect(el.querySelector('.collapsible__divider')).toBeTruthy();
    expect(el.querySelector('.collapsible__body')).toBeTruthy();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });
});
