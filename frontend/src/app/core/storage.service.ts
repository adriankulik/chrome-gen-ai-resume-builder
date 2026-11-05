import { Injectable } from '@angular/core';

const PREFIX = 'ats-resume-builder:';

/**
 * Tiny async key-value store backed by localStorage (JSON-serialised).
 * Everything stays in this browser; nothing is sent anywhere.
 * `set` rejects when the browser quota is exceeded so callers can surface it.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  async get<T>(key: string): Promise<T | undefined> {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: unknown): Promise<void> {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(PREFIX + key);
  }
}
