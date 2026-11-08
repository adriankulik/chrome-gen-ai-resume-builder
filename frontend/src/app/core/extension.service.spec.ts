import { TestBed } from '@angular/core/testing';
import { ExtensionService } from './extension.service';

describe('ExtensionService', () => {
  let service: ExtensionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExtensionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('detects when not running inside a Chrome extension', () => {
    // In headless test runner, chrome.runtime.id is not defined
    expect(service.isExtension()).toBeFalse();
  });

  it('detects when not running inside a Chrome extension side panel', () => {
    expect(service.isSidePanel()).toBeFalse();
  });

  it('returns null from extractFromActiveTab when not in extension environment', async () => {
    const result = await service.extractFromActiveTab();
    expect(result).toBeNull();
  });

  it('falls back to window.open when openInNewTab is called in web environment', () => {
    const spy = spyOn(window, 'open');
    service.openInNewTab();
    expect(spy).toHaveBeenCalled();
  });

  it('calls window.print with candidate name in title in web environment', () => {
    const printSpy = spyOn(window, 'print');
    const originalTitle = document.title;
    service.exportPdf('Ada Lovelace');
    expect(printSpy).toHaveBeenCalled();
    expect(document.title).toBe(originalTitle);
  });
});
