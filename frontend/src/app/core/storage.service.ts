import { Injectable } from '@angular/core';

const PREFIX = 'ats-resume-builder:';

/**
 * Universal async key-value store.
 * Automatically uses `chrome.storage.local` when running inside a Chrome extension (persisting
 * across browser sessions, immune to cookie wipes), and seamlessly falls back to `localStorage`
 * in standard web environments.
 * Everything stays 100% on the user's device — zero telemetry or network calls.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private get hasChromeStorage(): boolean {
    return typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined' && !!chrome.storage.local;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const fullKey = PREFIX + key;

    if (this.hasChromeStorage) {
      const fromChrome = await new Promise<T | undefined>((resolve) => {
        chrome.storage.local.get([fullKey], (res: Record<string, unknown>) => {
          if (chrome.runtime?.lastError) {
            resolve(undefined);
            return;
          }
          resolve(res?.[fullKey] as T | undefined);
        });
      });

      if (fromChrome !== undefined) {
        return fromChrome;
      }

      // Check localStorage for one-time seamless migration into chrome.storage.local
      try {
        const raw = localStorage.getItem(fullKey);
        if (raw !== null) {
          const parsed = JSON.parse(raw) as T;
          await this.set(key, parsed);
          return parsed;
        }
      } catch {
        // Ignore localStorage parsing errors during migration
      }
      return undefined;
    }

    const raw = localStorage.getItem(fullKey);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    const fullKey = PREFIX + key;

    if (this.hasChromeStorage) {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.set({ [fullKey]: value }, () => {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve();
        });
      });
      return;
    }

    localStorage.setItem(fullKey, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    const fullKey = PREFIX + key;

    if (this.hasChromeStorage) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.remove([fullKey], () => resolve());
      });
      return;
    }

    localStorage.removeItem(fullKey);
  }

  async clearAll(): Promise<void> {
    if (this.hasChromeStorage) {
      await new Promise<void>((resolve) => {
        chrome.storage.local.get(null, (items) => {
          const keysToRemove = Object.keys(items || {}).filter((k) => k.startsWith(PREFIX));
          if (keysToRemove.length) {
            chrome.storage.local.remove(keysToRemove, () => resolve());
          } else {
            resolve();
          }
        });
      });
    }

    const localKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(PREFIX) || k === 'raw-resume-text')) {
        localKeys.push(k);
      }
    }
    localKeys.forEach((k) => localStorage.removeItem(k));
  }
}
