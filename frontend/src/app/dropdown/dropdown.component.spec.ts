import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DropdownComponent } from './dropdown.component';

@Component({
  standalone: true,
  imports: [DropdownComponent],
  template: `<app-dropdown label="Theme" [options]="opts" [(value)]="val" />`,
})
class HostComponent {
  opts = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];
  val = 'a';
}

describe('DropdownComponent', () => {
  function setup() {
    const f = TestBed.createComponent(HostComponent);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    return { f, el, trigger: el.querySelector('button') as HTMLButtonElement };
  }

  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('shows the selected label', () => {
    expect(setup().trigger.textContent).toContain('Alpha');
  });

  it('opens on click and selects an option', () => {
    const { f, el, trigger } = setup();
    trigger.click();
    f.detectChanges();
    const opts = el.querySelectorAll<HTMLElement>('[role="option"]');
    expect(opts.length).toBe(2);
    opts[1].click();
    f.detectChanges();
    expect(f.componentInstance.val).toBe('b');
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });

  it('supports keyboard selection and Escape', () => {
    const { f, el, trigger } = setup();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    f.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    f.detectChanges();
    expect(f.componentInstance.val).toBe('b');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    f.detectChanges();
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    f.detectChanges();
    expect(el.querySelector('[role="listbox"]')).toBeNull();
  });
});
