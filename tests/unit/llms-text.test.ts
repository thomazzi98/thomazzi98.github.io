import { describe, expect, it } from 'vitest';
import { renderLlmsText } from '../../src/lib/llms-text';

describe('renderLlmsText', () => {
  const output = renderLlmsText({
    name: 'Rafael Thomazzi',
    positioning: 'I build the backend between systems.',
    summary: 'Backend engineer.',
    location: 'Sorocaba, Brazil',
    availability: 'Available now',
    siteUrl: 'https://thomazzi98.github.io/',
    links: [{ label: 'GitHub', url: 'https://github.com/thomazzi98' }],
    work: [
      {
        title: 'Queued onboarding',
        tagline: 'A retryable job.',
        url: 'https://thomazzi98.github.io/work/queued-bank-onboarding/',
        status: 'In production',
      },
    ],
    roles: [
      {
        title: 'Backend Engineer',
        company: 'Brainrocket',
        period: { start: '2026-02', end: '2026-09' },
      },
    ],
    technologyGroups: [{ label: 'Owned in production', names: ['Node.js'] }],
  });

  it('follows the llms.txt shape: title, blockquote, sections', () => {
    expect(output.startsWith('# Rafael Thomazzi\n\n> I build the backend between systems.\n')).toBe(
      true,
    );
    expect(output).toContain('\n## Work\n');
    expect(output).toContain('\n## Roles\n');
    expect(output).toContain('\n## Stack\n');
    expect(output).toContain('\n## Links\n');
  });

  it('links every piece of work and the plain-text resume', () => {
    expect(output).toContain(
      '- [Queued onboarding](https://thomazzi98.github.io/work/queued-bank-onboarding/): A retryable job. Status: In production.',
    );
    expect(output).toContain('- [Plain-text resume](https://thomazzi98.github.io/resume.txt)');
  });
});
