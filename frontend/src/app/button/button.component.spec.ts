import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
});
