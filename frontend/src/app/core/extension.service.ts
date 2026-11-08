import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ExtensionService {
  /** True when running inside a Chrome extension environment (MV3). */
  readonly isExtension = signal<boolean>(
    typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined' && !!chrome.runtime.id,
  );

  /** True when running inside Chrome extension side panel. */
  readonly isSidePanel = signal<boolean>(
    typeof window !== 'undefined' &&
      (window.location.search.includes('panel=1') ||
        (typeof chrome !== 'undefined' &&
          !!chrome.runtime?.id &&
          window.innerWidth <= 650 &&
          !window.location.search.includes('tab=1'))),
  );

  /**
   * Opens the application in a full browser tab.
   * If running in the extension sidepanel, opens the extension's index.html in a new tab.
   * Otherwise opens the current web URL in a new tab.
   */
  openInNewTab(query = 'tab=preview'): void {
    if (this.isExtension() && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL(`index.html?${query}`) });
    } else {
      const url = window.location.href.split('?')[0] + (query ? `?${query}` : '');
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Handles PDF export cleanly across all contexts:
   * - In Chrome Extension Side Panel (where window.print() is blocked by Chromium),
   *   opens the extension in a full browser tab with ?print=1 so the native print dialog opens.
   * - In standard web mode or full extension tab, triggers window.print().
   */
  exportPdf(fullName?: string): void {
    if (this.isSidePanel()) {
      const targetUrl = chrome.runtime?.getURL
        ? chrome.runtime.getURL('index.html?print=1')
        : 'index.html?print=1';
      if (chrome.tabs?.create) {
        chrome.tabs.create({ url: targetUrl });
      } else {
        window.open(targetUrl, '_blank');
      }
      return;
    }

    const prev = document.title;
    const name = fullName?.trim();
    document.title = name ? `${name} - Resume` : 'Resume';
    window.print();
    document.title = prev;
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

    let tab: chrome.tabs.Tab | undefined;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = tabs[0];
      if (!tab) {
        const fallbacks = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        tab = fallbacks[0];
      }
    } catch {
      // Inability to query tabs
    }

    if (!tab?.id) {
      throw new Error('No active browser tab found.');
    }

    const url = tab.url || '';
    if (
      url.startsWith('chrome://') ||
      url.startsWith('chrome-extension://') ||
      url.startsWith('about:') ||
      url.startsWith('edge://') ||
      url.startsWith('view-source:')
    ) {
      throw new Error('Cannot extract from internal browser pages. Switch to a job listing tab first.');
    }

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // 1. Check user text selection (including in textareas/inputs)
          let sel = window.getSelection()?.toString()?.trim();
          if (!sel) {
            const active = document.activeElement;
            if (active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement) {
              const start = active.selectionStart;
              const end = active.selectionEnd;
              if (start !== null && end !== null && end > start) {
                sel = active.value.substring(start, end).trim();
              }
            }
          }
          if (sel && sel.length >= 15) {
            return sel;
          }

          // 2. Specific selectors for popular job boards & applicant tracking systems
          const selectors = [
            // LinkedIn
            '.jobs-description-content__text',
            '.jobs-description__content',
            '.jobs-box__html-content',
            '.show-more-less-html__markup',
            '.job-details-jobs-unified-top-card__content--two-pane',
            // Indeed
            '#jobDescriptionText',
            '.jobsearch-jobDescriptionText',
            '.jobsearch-JobComponent-description',
            // Greenhouse
            '#content',
            '.job-post',
            '#app_body',
            // Lever
            '.section-wrapper.accent-section',
            '.posting-headline',
            '.section-wrapper',
            // Workday
            '[data-automation-id="jobPostingDescription"]',
            '[data-automation-id="jobPostingPage"]',
            // Glassdoor & ZipRecruiter
            '.job-description',
            '[data-test="job-description"]',
            '.job_description',
            '.jobDescriptionSection',
            // Generic modern job containers
            'article[class*="job"]',
            '[class*="job-description"]',
            '[class*="jobDescription"]',
            '[id*="job-description"]',
            '[id*="jobDescription"]',
            'main',
            '[role="main"]',
            'article',
          ];

          for (const s of selectors) {
            const el = document.querySelector(s);
            if (el) {
              const text = (el as HTMLElement).innerText?.trim();
              if (text && text.length > 60) {
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
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Cannot access') || msg.includes('permission')) {
        throw new Error('Permission denied to read active tab. Highlight the job description or paste it directly.', {
          cause: err,
        });
      }
      throw new Error('Could not extract text from active tab. Highlight the text or paste directly.', {
        cause: err,
      });
    }
  }
}
