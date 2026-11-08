import { MasterVault, normalizeVault } from './vault.model';

/**
 * Heuristic/rule-based resume text parser used when Chrome built-in AI is unavailable.
 * Extracts contact information, professional summary, work experience with bullet points,
 * education, and skills.
 */
export function fallbackParseResume(text: string, base: MasterVault): MasterVault {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return base;

  const lines = clean.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. Contact info extraction
  const emailMatch = clean.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : base.contact.email;

  const phoneMatch = clean.match(/(\+?\d[\d\s().-]{7,}\d)/);
  const phone = phoneMatch ? phoneMatch[1].trim() : base.contact.phone;

  const linkMatches = clean.match(/(?:https?:\/\/|www\.|linkedin\.com\/in\/|github\.com\/)[^\s,]+/gi) ?? [];
  const links = [...new Set(linkMatches.map((l) => l.replace(/^[,\s]+|[,\s]+$/g, '')))];

  // Guess full name from first non-contact line
  let fullName = '';
  for (const line of lines.slice(0, 5)) {
    if (
      !line.includes('@') &&
      !line.match(/\+?\d[\d\s().-]{7,}/) &&
      !line.toLowerCase().startsWith('http') &&
      !line.toLowerCase().includes('curriculum') &&
      !line.toLowerCase().includes('resume') &&
      line.length < 50
    ) {
      fullName = line;
      break;
    }
  }

  // Guess location (e.g. "City, Country" or "City, State")
  const locationMatch = clean.match(/\b([A-Z][a-zA-Z\s.-]+,\s*[A-Z][a-zA-Z\s.-]+)\b/);
  const location = locationMatch && locationMatch[1].length < 40 ? locationMatch[1] : base.contact.location;

  // 2. Section splitting
  const SECTION_HEADERS: { type: 'summary' | 'experience' | 'skills' | 'education'; pattern: RegExp }[] = [
    { type: 'summary', pattern: /^(summary|professional summary|profile|about me|objective)\b/i },
    { type: 'experience', pattern: /^(experience|work experience|employment history|work history|professional experience)\b/i },
    { type: 'skills', pattern: /^(skills|technical skills|core competencies|technologies)\b/i },
    { type: 'education', pattern: /^(education|academic background|qualifications)\b/i },
  ];

  type SectionType = 'header' | 'summary' | 'experience' | 'skills' | 'education';
  let currentSection: SectionType = 'header';
  const sectionContent: Record<SectionType, string[]> = {
    header: [],
    summary: [],
    experience: [],
    skills: [],
    education: [],
  };

  for (const line of lines) {
    const matchedHeader = SECTION_HEADERS.find((h) => h.pattern.test(line));
    if (matchedHeader) {
      currentSection = matchedHeader.type;
    } else {
      sectionContent[currentSection].push(line);
    }
  }

  // 3. Summary
  let summary = sectionContent.summary.join(' ').trim();
  if (!summary && sectionContent.header.length > 2) {
    // If no explicit summary header, lines following contact details may be the summary
    summary = sectionContent.header.slice(2, 5).join(' ').trim();
  }
  if (!summary) summary = base.summary;

  // 4. Skills
  const rawSkills = sectionContent.skills.join(' ');
  let skills: string[] = [];
  if (rawSkills) {
    skills = rawSkills
      .split(/[,•·|\n/]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 35 && !/^(skills|proficient in|experienced with):?$/i.test(s));
  }
  if (!skills.length) skills = base.skills;

  // 5. Experience
  const expLines = sectionContent.experience;
  const rawRoles: { role: string; company: string; startDate: string; endDate: string; bullets: string[] }[] = [];
  let currentRole: { role: string; company: string; startDate: string; endDate: string; bullets: string[] } | null = null;

  const isBullet = (l: string) => /^[-•*·–—]\s*/.test(l);
  const cleanBullet = (l: string) => l.replace(/^[-•*·–—]\s*/, '').trim();

  for (const line of expLines) {
    if (isBullet(line)) {
      if (!currentRole) {
        currentRole = { role: 'Professional Experience', company: '', startDate: '', endDate: 'Present', bullets: [] };
        rawRoles.push(currentRole);
      }
      const bText = cleanBullet(line);
      if (bText) currentRole.bullets.push(bText);
    } else {
      // Check if line contains dates like "2020 - 2023" or "03/2021 - Present"
      const dateMatch = line.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|[0-9]{4}|[0-9]{2}\/[0-9]{4})\s*[-–—to]\s*(?:Present|[0-9]{4}|[0-9]{2}\/[0-9]{4}))\b/i);
      if (dateMatch || line.includes(' - ') || line.includes(' at ') || line.includes(' | ')) {
        // Start a new role
        const parts = line.split(/[-–—|•]/).map((p) => p.trim()).filter(Boolean);
        currentRole = {
          role: parts[0] || 'Role',
          company: parts[1] || '',
          startDate: '',
          endDate: 'Present',
          bullets: [],
        };
        rawRoles.push(currentRole);
      } else if (currentRole && currentRole.bullets.length === 0 && !currentRole.company) {
        currentRole.company = line;
      } else if (currentRole && currentRole.bullets.length > 0) {
        // Append continuation or add as bullet
        currentRole.bullets.push(line);
      }
    }
  }

  let bulletCounter = 100;
  const experience = rawRoles.length
    ? rawRoles.map((r, i) => ({
        id: `exp_${i + 1}`,
        role: r.role || 'Role',
        company: r.company || '',
        startDate: r.startDate || '',
        endDate: r.endDate || 'Present',
        bullets: (r.bullets.length ? r.bullets : ['Key achievement and responsibility.']).map((text) => ({
          id: `b_${++bulletCounter}`,
          text,
        })),
      }))
    : base.experience;

  // 6. Education
  const eduLines = sectionContent.education;
  const rawEdu: { degree: string; institution: string; year: string }[] = [];
  for (const line of eduLines) {
    if (line.match(/(university|college|polytechnic|institute|academy|b\.?s|m\.?s|bachelor|master|phd)/i)) {
      const parts = line.split(/[,–—|-]/).map((p) => p.trim());
      rawEdu.push({
        degree: parts[0] || line,
        institution: parts[1] || '',
        year: parts[2] || '',
      });
    }
  }

  const education = rawEdu.length
    ? rawEdu.map((e, i) => ({
        id: `edu_${i + 1}`,
        degree: e.degree || 'Degree',
        institution: e.institution || 'Institution',
        year: e.year || '',
      }))
    : base.education;

  const draft: MasterVault = {
    contact: {
      fullName: fullName || base.contact.fullName,
      email,
      phone,
      location,
      links: links.length ? links : base.contact.links,
      photoDataUrl: base.contact.photoDataUrl,
    },
    summary,
    experience,
    education,
    skills,
    settings: base.settings,
  };

  return normalizeVault(draft);
}
