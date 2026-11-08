import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RadioCardComponent } from './radio-card.component';

@Component({
  standalone: true,
  imports: [RadioCardComponent],
  template: `
    <app-radio-card
      label="Option A"
      description="Description for Option A"
      value="opt-a"
      name="test-group"
      [(selectedValue)]="selected"
    />
    <app-radio-card
      label="Option B"
      description="Description for Option B"
      value="opt-b"
      name="test-group"
      [(selectedValue)]="selected"
    />
  `,
})
class TestHostComponent {
  readonly selected = signal<string>('opt-a');
}

describe('RadioCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();
  });

  it('renders radio cards with proper labels and selected state', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.radio-card');
    expect(cards.length).toBe(2);

    expect(cards[0].classList.contains('selected')).toBeTrue();
    expect(cards[1].classList.contains('selected')).toBeFalse();

    const titleA = cards[0].querySelector('.radio-card__title')?.textContent;
    const descA = cards[0].querySelector('.radio-card__desc')?.textContent;
    expect(titleA).toContain('Option A');
    expect(descA).toContain('Description for Option A');
  });

  it('updates selected value when clicked', () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.radio-card');
    cards[1].click();
    fixture.detectChanges();

    expect(fixture.componentInstance.selected()).toBe('opt-b');
    expect(cards[1].classList.contains('selected')).toBeTrue();
    expect(cards[0].classList.contains('selected')).toBeFalse();
  });
});
