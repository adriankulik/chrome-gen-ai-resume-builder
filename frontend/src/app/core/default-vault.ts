import { MasterVault } from './vault.model';

const DEFAULT_VAULT: MasterVault = {
  contact: {
    fullName: 'Jan Kowalski',
    email: 'jan@example.com',
    phone: '+48 123 456 789',
    location: 'Wrocław, Poland',
    links: ['linkedin.com/in/jankowalski', 'github.com/jankowalski'],
    photoDataUrl: '',
  },
  summary:
    'Senior Frontend Engineer with 6+ years of experience building performant, accessible web applications.',
  experience: [
    {
      id: 'exp_1',
      role: 'Senior Frontend Developer',
      company: 'TechCorp',
      startDate: '2022-03',
      endDate: 'Present',
      bullets: [
        { id: 'b_101', text: 'Architected micro-frontend migration reducing bundle size by 38%.' },
        { id: 'b_102', text: 'Mentored 5 junior developers and conducted technical interviews.' },
        { id: 'b_103', text: 'Built a shared React component library adopted by 6 product teams.' },
        { id: 'b_104', text: 'Introduced GraphQL gateway, cutting API round-trips by 45%.' },
      ],
    },
    {
      id: 'exp_2',
      role: 'Frontend Developer',
      company: 'WebStudio',
      startDate: '2019-06',
      endDate: '2022-02',
      bullets: [
        { id: 'b_105', text: 'Delivered 20+ customer-facing TypeScript applications on schedule.' },
        { id: 'b_106', text: 'Containerised build pipelines with Docker, reducing CI time by 30%.' },
        { id: 'b_107', text: 'Improved Lighthouse accessibility scores from 72 to 96.' },
      ],
    },
  ],
  education: [
    {
      id: 'edu_1',
      degree: 'B.Sc. in Computer Science',
      institution: 'Wrocław University of Science and Technology',
      year: '2016 - 2020',
    },
  ],
  skills: ['TypeScript', 'React', 'Node.js', 'GraphQL', 'Docker', 'Accessibility', 'CI/CD'],
  settings: {
    theme: 'modern-slate',
    showPhoto: true,
    strictOnePage: true,
    includeRodoClause: true,
    rodoCompanyName: '',
  },
};

/** Starting content for a fresh vault (replaced as soon as the user edits or imports). */
export function defaultVault(): MasterVault {
  return structuredClone(DEFAULT_VAULT);
}
