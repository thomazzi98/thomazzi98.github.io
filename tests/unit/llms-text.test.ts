import { describe, expect, it } from 'vitest';
import { renderLlmsText } from '../../src/lib/llms-text';

describe('renderLlmsText', () => {
  const output = renderLlmsText({
    name: 'Rafael Thomazzi',
    positioning: 'I build the backend between products, payment providers and chains.',
    summary: 'Backend engineer.',
    location: 'Sorocaba, Brazil',
    availability: 'Available now',
    siteUrl: 'https://thomazzi98.github.io/',
    links: [{ label: 'GitHub', url: 'https://github.com/thomazzi98' }],
    systems: [
      {
        name: 'CryptoPay',
        tagline: 'A crypto payment processor that decides what happened by reading the chain.',
        url: 'https://thomazzi98.github.io/systems/cryptopay/',
        repositoryUrl: 'https://github.com/thomazzi98/cryptopay',
        dataUrl: 'https://thomazzi98.github.io/systems/cryptopay.json',
      },
    ],
    roles: [
      {
        title: 'Strong Middle Backend Developer',
        company: 'BrainRocket',
        period: { start: '2026-02', end: '2026-09' },
      },
    ],
    technologyGroups: [{ label: 'Owned in production', names: ['Node.js'] }],
  });

  it('follows the llms.txt shape: title, blockquote, sections', () => {
    expect(
      output.startsWith(
        '# Rafael Thomazzi\n\n> I build the backend between products, payment providers and chains.\n',
      ),
    ).toBe(true);
    expect(output).toContain('\n## Systems\n');
    expect(output).toContain('\n## Roles\n');
    expect(output).toContain('\n## Stack\n');
    expect(output).toContain('\n## Links\n');
    expect(output).not.toContain('## Work');
  });

  it('links every system to its page, its repository and its data file', () => {
    expect(output).toContain(
      '- [CryptoPay](https://thomazzi98.github.io/systems/cryptopay/): A crypto payment processor that decides what happened by reading the chain. Repository: https://github.com/thomazzi98/cryptopay\n  - Machine-readable model and transcripts: https://thomazzi98.github.io/systems/cryptopay.json',
    );
  });

  it('lists the roles and links the plain-text resume and the about page', () => {
    expect(output).toContain('- 2026-02 → 2026-09: Strong Middle Backend Developer, BrainRocket');
    expect(output).toContain('- [Plain-text resume](https://thomazzi98.github.io/resume.txt)');
    expect(output).toContain('- [About](https://thomazzi98.github.io/about/)');
  });
});
