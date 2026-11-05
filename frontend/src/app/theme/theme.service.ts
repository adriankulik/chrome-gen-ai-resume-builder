import { Injectable, OnDestroy, signal } from '@angular/core';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'akl-theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * App-wide theme. Resolution order on boot:
 *   1. Explicit user override stored in localStorage (set by `toggle()`).
 *   2. `prefers-color-scheme` via window.matchMedia.
 *   3. Fallback: dark.
 *
 * OS changes are respected unless the user has clicked the toggle.
 * Cross-tab syncing: a `storage` event from another tab updates the theme
 * here too, keeping all open tabs in sync.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  readonly theme = signal<Theme>('dark');
  /** True once the user has clicked the toggle; OS changes are then ignored. */
  readonly hasUserOverride = signal(false);

  private mql: MediaQueryList | null = null;

  private readonly mqlListener = (e: MediaQueryListEvent): void => {
    if (this.hasUserOverride()) return;
    this.applyTheme(e.matches ? 'dark' : 'light');
  };

  private readonly storageListener = (e: StorageEvent): void => {
    if (e.key !== STORAGE_KEY || e.newValue === null) return;
    if (e.newValue === 'dark' || e.newValue === 'light') {
      this.hasUserOverride.set(true);
      this.applyTheme(e.newValue);
    }
  };

  constructor() {
    this.theme.set(this.resolveInitialTheme());
    this.applyAttribute(this.theme());
    this.subscribeToSystem();
    this.subscribeToStorage();
  }

  ngOnDestroy(): void {
    this.mql?.removeEventListener('change', this.mqlListener);
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.hasUserOverride.set(true);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    this.applyTheme(next);
  }

  private applyTheme(t: Theme): void {
    this.theme.set(t);
    this.applyAttribute(t);
  }

  private applyAttribute(t: Theme): void {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', t);
  }

  private resolveInitialTheme(): Theme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        this.hasUserOverride.set(true);
        return stored;
      }
    } catch { /* ignore */ }

    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light';
    }
    return 'dark';
  }

  private subscribeToSystem(): void {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    this.mql = window.matchMedia(MEDIA_QUERY);
    this.mql.addEventListener('change', this.mqlListener);
  }

  private subscribeToStorage(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', this.storageListener);
  }
}
