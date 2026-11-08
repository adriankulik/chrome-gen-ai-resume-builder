import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LucideSun } from '@lucide/angular';
import { ButtonComponent, ButtonVariant, ButtonSize } from './button.component';

@Component({
  template: `
    <button
      app-button
      [variant]="variant"
      [size]="size"
      [iconOnly]="iconOnly"
      [iconLeading]="icon"
      [loading]="loading"
      [loadingText]="loadingText"
      [loadingMessages]="loadingMessages"
      [loadingIntervalMs]="loadingIntervalMs"
    >Label</button>
  `,
  standalone: true,
  imports: [ButtonComponent],
})
class TestHostComponent {
  variant: ButtonVariant = 'primary';
  size: ButtonSize = 'md';
  iconOnly = false;
  icon = LucideSun.icon;
  loading = false;
  loadingText?: string;
  loadingMessages: string[] = [];
  loadingIntervalMs = 5000;
}

describe('ButtonComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;

  function getButton(): HTMLButtonElement {
    return hostFixture.debugElement.query(By.directive(ButtonComponent))
      .nativeElement as HTMLButtonElement;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostFixture.detectChanges();
  });

  it('should create via attribute selector on <button>', () => {
    expect(getButton()).toBeTruthy();
  });

  it('should apply app-button base class', () => {
    expect(getButton().classList).toContain('app-button');
  });

  it('applies primary variant class', () => {
    expect(getButton().classList).toContain('app-button--primary');
  });

  it('applies secondary variant class when variant changes', () => {
    hostFixture.componentInstance.variant = 'secondary';
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--secondary');
    expect(getButton().classList).not.toContain('app-button--primary');
  });

  it('applies close variant class', () => {
    hostFixture.componentInstance.variant = 'close';
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--close');
  });

  it('applies ghost variant class', () => {
    hostFixture.componentInstance.variant = 'ghost';
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--ghost');
  });

  it('applies danger variant class', () => {
    hostFixture.componentInstance.variant = 'danger';
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--danger');
  });

  it('applies md size class by default', () => {
    expect(getButton().classList).toContain('app-button--md');
  });

  it('applies sm size class', () => {
    hostFixture.componentInstance.size = 'sm';
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--sm');
    expect(getButton().classList).not.toContain('app-button--md');
  });

  it('applies icon-only class when iconOnly is true', () => {
    hostFixture.componentInstance.iconOnly = true;
    hostFixture.detectChanges();
    expect(getButton().classList).toContain('app-button--icon-only');
  });

  it('renders label text when iconOnly is false', () => {
    expect(getButton().textContent).toContain('Label');
  });

  it('hides label slot when iconOnly is true', () => {
    hostFixture.componentInstance.iconOnly = true;
    hostFixture.detectChanges();
    const label = getButton().querySelector('.app-button__label');
    expect(label).toBeNull();
  });

  it('renders a leading icon SVG', () => {
    const icon = getButton().querySelector('.app-button__icon--lead');
    expect(icon).toBeTruthy();
  });

  it('renders spinner and disables button when loading is true', () => {
    hostFixture.componentInstance.loading = true;
    hostFixture.detectChanges();
    const btn = getButton();
    expect(btn.classList).toContain('app-button--loading');
    expect(btn.getAttribute('aria-busy')).toBe('true');
    expect(btn.disabled).toBeTrue();
    const spinner = btn.querySelector('.app-button__icon--spin');
    expect(spinner).toBeTruthy();
  });

  it('displays static loadingText when provided', () => {
    hostFixture.componentInstance.loading = true;
    hostFixture.componentInstance.loadingText = 'Saving…';
    hostFixture.detectChanges();
    expect(getButton().textContent).toContain('Saving…');
  });

  it('rotates through loadingMessages on the specified interval', fakeAsync(() => {
    hostFixture.componentInstance.loading = true;
    hostFixture.componentInstance.loadingMessages = ['Step 1…', 'Step 2…', 'Step 3…'];
    hostFixture.componentInstance.loadingIntervalMs = 1000;
    hostFixture.detectChanges();

    expect(getButton().textContent).toContain('Step 1…');

    tick(1000);
    hostFixture.detectChanges();
    expect(getButton().textContent).toContain('Step 2…');

    tick(1000);
    hostFixture.detectChanges();
    expect(getButton().textContent).toContain('Step 3…');

    tick(1000);
    hostFixture.detectChanges();
    expect(getButton().textContent).toContain('Step 1…');

    // clean up timer on unload
    hostFixture.componentInstance.loading = false;
    hostFixture.detectChanges();
  }));
});
