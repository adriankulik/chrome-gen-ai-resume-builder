import { TestBed } from '@angular/core/testing';
import { VaultService } from './vault.service';

const KEY = 'ats-resume-builder:master-vault';
const tick = () => new Promise((r) => setTimeout(r, 20));

describe('VaultService persistence', () => {
  beforeEach(() => localStorage.removeItem(KEY));
  afterEach(() => localStorage.removeItem(KEY));

  it('is pristine and does not persist example data until the user edits', async () => {
    const vs = TestBed.inject(VaultService);
    await tick();
    TestBed.tick();
    expect(vs.pristine()).toBeTrue();
    expect(localStorage.getItem(KEY)).toBeNull();

    vs.vault().summary = 'Mine';
    vs.touch();
    TestBed.tick();
    await tick();
    expect(vs.pristine()).toBeFalse();
    expect(JSON.parse(localStorage.getItem(KEY) ?? '{}').summary).toBe('Mine');
  });

  it('loads a saved vault from localStorage and is not pristine', async () => {
    localStorage.setItem(KEY, JSON.stringify({ summary: 'Saved' }));
    const vs = TestBed.inject(VaultService);
    await tick();
    expect(vs.vault().summary).toBe('Saved');
    expect(vs.pristine()).toBeFalse();
  });
});
