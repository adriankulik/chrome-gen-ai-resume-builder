import { fallbackParseResume } from './fallback-parser';
import { defaultVault } from './default-vault';

describe('fallbackParseResume', () => {
  const base = defaultVault();

  it('extracts name, email, phone, and links from raw text', () => {
    const raw = `
      John Doe
      john.doe@example.com
      +1 555-123-4567
      https://linkedin.com/in/johndoe

      Summary
      Passionate engineer with 8 years building scalable systems.

      Experience
      Staff Engineer - Acme Corp (2020 - Present)
      - Designed distributed payment architecture handling $50M/mo.
      - Mentored 12 engineers across 3 squads.

      Skills
      TypeScript, Go, Kubernetes, PostgreSQL

      Education
      B.S. in Computer Science, Stanford University, 2016
    `;

    const parsed = fallbackParseResume(raw, base);
    expect(parsed.contact.fullName).toBe('John Doe');
    expect(parsed.contact.email).toBe('john.doe@example.com');
    expect(parsed.contact.phone).toBe('+1 555-123-4567');
    expect(parsed.contact.links).toContain('https://linkedin.com/in/johndoe');
    expect(parsed.summary).toContain('Passionate engineer');
    expect(parsed.skills).toContain('TypeScript');
    expect(parsed.skills).toContain('Go');
    expect(parsed.skills).toContain('Kubernetes');
    expect(parsed.experience.length).toBeGreaterThanOrEqual(1);
    expect(parsed.experience[0].bullets.length).toBeGreaterThanOrEqual(2);
    expect(parsed.experience[0].bullets[0].text).toContain('Designed distributed payment architecture');
  });

  it('handles empty input gracefully by returning base vault', () => {
    const parsed = fallbackParseResume('', base);
    expect(parsed.contact.fullName).toBe(base.contact.fullName);
  });
});
