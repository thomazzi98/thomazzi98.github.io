import { describe, expect, it } from 'vitest';
import { renderResumeText, type ResumeSource } from '../../src/lib/resume-text';

const source: ResumeSource = {
  name: 'Rafael Thomazzi',
  headline: 'Senior Software Engineer · Backend',
  location: 'Sorocaba, São Paulo, Brazil',
  timezone: 'UTC−3',
  availability: 'Available now, remote from Brazil',
  email: 'rafathomazzi98@gmail.com',
  links: [
    'https://github.com/thomazzi98',
    'https://www.linkedin.com/in/rafael-thomazzi-3524b1179/',
  ],
  summary: 'Backend engineer with six years in Node.js and TypeScript.',
  roles: [
    {
      title: 'Backend Engineer',
      company: 'Brainrocket',
      companyGloss: 'payments group',
      location: 'Remote, Brazil',
      period: { start: '2026-02', end: '2026-09' },
      stack: ['TypeScript', 'Node.js'],
      body: 'Payment gateway work.\n\n## Outcomes\n\n- Shipped integrations that moved money between the products and the providers behind them, every day of the week.',
    },
  ],
  projects: [
    {
      title: 'Queued onboarding',
      tagline: 'Bank-account creation as a retryable job.',
      url: 'https://thomazzi98.github.io/work/queued-bank-onboarding/',
    },
  ],
  education: [
    {
      credential: 'CST',
      field: 'Systems Analysis and Development',
      institution: 'FATEC Sorocaba',
      institutionGloss: 'public state technology college',
      year: 2019,
    },
  ],
  technologyGroups: [{ label: 'Owned in production', names: ['TypeScript', 'Node.js'] }],
  siteUrl: 'https://thomazzi98.github.io/',
  generatedOn: '2026-09-06',
};

describe('renderResumeText', () => {
  const output = renderResumeText(source);
  const lines = output.split('\n');

  it('opens with the name in capitals and the headline', () => {
    expect(lines.slice(0, 2)).toEqual(['RAFAEL THOMAZZI', 'Senior Software Engineer · Backend']);
  });

  it('never exceeds 78 columns', () => {
    const tooLong = lines.filter((line) => line.length > 78);
    expect(tooLong).toEqual([]);
  });

  it('renders a role with its period, gloss, stack and body', () => {
    expect(output).toContain('2026-02 → 2026-09  Backend Engineer, Brainrocket');
    expect(output).toContain('payments group · Remote, Brazil');
    expect(output).toContain('Stack: TypeScript, Node.js');
    expect(output).toContain('OUTCOMES\n\n- Shipped integrations');
  });

  it('lists selected work with absolute links and closes with the generation line', () => {
    expect(output).toContain('https://thomazzi98.github.io/work/queued-bank-onboarding/');
    expect(output.trimEnd().split('\n\n').at(-1)).toContain('Generated 2026-09-06 from');
    expect(output.endsWith('\n')).toBe(true);
  });
});
