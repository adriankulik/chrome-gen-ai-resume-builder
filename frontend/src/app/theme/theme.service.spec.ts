import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'akl-theme';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve to a valid theme on init', () => {
    expect(['dark', 'light']).toContain(service.theme());
  });

  it('should set data-theme on documentElement', () => {
    const attr = document.documentElement.getAttribute('data-theme') ?? '';
    expect(['dark', 'light']).toContain(attr);
  });

  it('should start with hasUserOverride false when no storage value exists', () => {
    expect(service.hasUserOverride()).toBeFalse();
  });

  it('toggle() flips dark → light', () => {
    // force dark by toggling to it if needed
    if (service.theme() !== 'dark') service.toggle();
    service.toggle();
    expect(service.theme()).toBe('light');
  });

  it('toggle() flips light → dark', () => {
    if (service.theme() !== 'light') service.toggle();
    service.toggle();
    expect(service.theme()).toBe('dark');
  });

  it('toggle() sets hasUserOverride', () => {
    service.toggle();
    expect(service.hasUserOverride()).toBeTrue();
  });

  it('toggle() persists the chosen theme to localStorage', () => {
    const before = service.theme();
    service.toggle();
    const stored = localStorage.getItem(STORAGE_KEY);
    expect(stored).toBe(before === 'dark' ? 'light' : 'dark');
  });

  it('reads stored theme from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, 'light');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.theme()).toBe('light');
    expect(fresh.hasUserOverride()).toBeTrue();
  });

  it('respects stored "dark" from localStorage on init', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(ThemeService);
    expect(fresh.theme()).toBe('dark');
  });

  it('syncs theme from a storage event (cross-tab)', () => {
    const current = service.theme();
    const next = current === 'dark' ? 'light' : 'dark';

    window.dispatchEvent(
      new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }),
    );

    expect(service.theme()).toBe(next);
    expect(service.hasUserOverride()).toBeTrue();
  });

  it('ignores storage events for other keys', () => {
    const current = service.theme();
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'other-key', newValue: 'light' }),
    );
    expect(service.theme()).toBe(current);
  });
});
