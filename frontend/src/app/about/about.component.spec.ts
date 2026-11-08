import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AboutComponent } from './about.component';

describe('AboutComponent', () => {
  let component: AboutComponent;
  let fixture: ComponentFixture<AboutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders app description and title', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Local AI Resume');
    expect(el.textContent).toContain('Client-Side Privacy');
    expect(el.textContent).toContain('On-Device AI Engine');
  });

  it('contains links to author GitHub profile and local-ai-resume repository', () => {
    const el = fixture.nativeElement as HTMLElement;
    const links = el.querySelectorAll('a');
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('https://github.com/adriankulik');
    expect(hrefs).toContain('https://github.com/adriankulik/local-ai-resume');

    // Both external links must open in new tab securely
    links.forEach((a) => {
      expect(a.getAttribute('target')).toBe('_blank');
      expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  it('emits closed output when Close button is clicked', () => {
    let closedEmitted = false;
    component.closed.subscribe(() => {
      closedEmitted = true;
    });

    const closeBtn = fixture.nativeElement.querySelector('.about-footer button') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();

    expect(closedEmitted).toBeTrue();
  });
});
