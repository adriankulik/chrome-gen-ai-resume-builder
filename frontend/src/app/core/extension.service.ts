import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExtensionService {
  /** True when running inside a Chrome extension environment (MV3). */
  readonly isExtension = signal<boolean>(
    typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !!chrome.runtime.id,
  );

  /**
   * Opens the application in a full browser tab.
   * If running in the extension sidepanel, opens the extension's index.html in a new tab.
   * Otherwise opens the current web URL in a new tab.
   */
  openInNewTab(): void {
    if (this.isExtension() && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    } else {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Extracts the job description from the currently active browser tab.
   * Prioritizes:
   * 1. Any text the user currently has selected/highlighted.
   * 2. Known job posting containers (LinkedIn, Indeed, Greenhouse, Lever, Workday, etc.).
   * 3. Main article / main text content.
   * Returns null if running in standard web mode or if extraction fails.
   */
  async extractFromActiveTab(): Promise<string | null> {
    if (!this.isExtension() || !chrome.tabs?.query || !chrome.scripting?.executeScript) {
      return null;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return null;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 1. Check user text selection
          const sel = window.getSelection()?.toString()?.trim();
          if (sel && sel.length >= 30) {
            return sel;
          }

          // 2. Specific selectors for popular job boards & applicant tracking systems
          const selectors = [
            // LinkedIn
            '.jobs-description-content__text',
            '.jobs-description__content',
            '.jobs-box__html-content',
            '.show-more-less-html__markup',
            // Indeed
            '#jobDescriptionText',
            '.jobsearch-jobDescriptionText',
            // Greenhouse
            '#content',
            '.job-post',
            // Lever
            '.section-wrapper.accent-section',
            // Workday
            '[data-automation-id="jobPostingDescription"]',
            // Generic modern job containers
            'article[class*="job"]',
            '[class*="job-description"]',
            '[class*="jobDescription"]',
            '[id*="job-description"]',
            '[id*="jobDescription"]',
            'main',
            'article',
          ];

          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
              const text = (el as HTMLElement).innerText?.trim();
              if (text && text.length > 80) {
                return text;
              }
            }
          }

          // 3. Fallback: document body text
          return document.body?.innerText?.trim() || '';
        },
      });

      const extracted = results?.[0]?.result;
      if (typeof extracted === 'string' && extracted.trim().length > 0) {
        return extracted.trim();
      }
      return null;
    } catch (err) {
      console.warn('Failed to extract text from active tab:', err);
      return null;
    }
  }
}
