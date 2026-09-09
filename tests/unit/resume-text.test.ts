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
  summary: 'Backend engineer with seven years in Node.js and TypeScript.',
  roles: [
    {
      title: 'Strong Middle Backend Developer',
      company: 'BrainRocket',
      companyGloss: 'technology group building products for the iGaming and payments industry',
      location: 'Limassol, Cyprus (remote from Brazil)',
      period: { start: '2026-02', end: '2026-09' },
      stack: ['Node.js', 'TypeScript', 'NestJS', 'PostgreSQL'],
      body: 'Payment gateway work.\n\n#### Outcomes\n\n- Provider integrations delivered end to end: deposits, withdrawals, provider callbacks and transaction status handling.',
    },
  ],
  systems: [
    {
      name: 'CryptoPay',
      tagline: 'A crypto payment processor that decides what happened by reading the chain.',
      url: 'https://thomazzi98.github.io/systems/cryptopay/',
      repositoryUrl: 'https://github.com/thomazzi98/cryptopay',
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
  generatedOn: '2026-09-09',
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
    expect(output).toContain('2026-02 → 2026-09  Strong Middle Backend Developer, BrainRocket');
    expect(output).toContain('Limassol, Cyprus (remote from Brazil)');
    expect(output).toContain('Stack: Node.js, TypeScript, NestJS, PostgreSQL');
    expect(output).toContain('OUTCOMES\n\n- Provider integrations delivered end to end');
  });

  it('lists each system with its tagline, page and repository', () => {
    expect(output).toContain('SYSTEMS\n');
    expect(output).toContain(
      [
        '- CryptoPay: A crypto payment processor that decides what happened by reading',
        '  the chain.',
        '  https://thomazzi98.github.io/systems/cryptopay/',
        '  https://github.com/thomazzi98/cryptopay',
      ].join('\n'),
    );
  });

  it('keeps the sections in order and closes with the generation line', () => {
    const headings = ['SUMMARY', 'EXPERIENCE', 'SYSTEMS', 'EDUCATION', 'TECHNOLOGIES'];
    const positions = headings.map((heading) => lines.indexOf(heading));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((first, second) => first - second)).toEqual(positions);
    expect(output.trimEnd().split('\n\n').at(-1)).toContain('Generated 2026-09-09 from');
    expect(output.endsWith('\n')).toBe(true);
  });
});
