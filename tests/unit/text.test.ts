import { describe, expect, it } from 'vitest';
import { markdownToPlainText, wrapLine } from '../../src/lib/text';

describe('wrapLine', () => {
  it('wraps at word boundaries within the width', () => {
    expect(wrapLine('one two three four five', 9)).toEqual(['one two', 'three', 'four five']);
  });

  it('keeps a word longer than the width on its own line', () => {
    expect(wrapLine('short averyveryverylongword end', 10)).toEqual([
      'short',
      'averyveryverylongword',
      'end',
    ]);
  });

  it('indents continuation lines', () => {
    expect(wrapLine('- alpha beta gamma', 12, '  ')).toEqual(['- alpha beta', '  gamma']);
  });
});

describe('markdownToPlainText', () => {
  it('turns second-level headings into upper-case labels', () => {
    expect(markdownToPlainText('## Outcomes\n\nShipped.')).toBe('OUTCOMES\n\nShipped.');
  });

  it('joins wrapped list items and re-wraps them with a hanging indent', () => {
    const markdown = '- first item that\n  continues here\n- second';
    expect(markdownToPlainText(markdown, 20)).toBe('- first item that\n  continues here\n- second');
  });

  it('reflows paragraphs and strips inline code markers', () => {
    const markdown = 'Reads the `execution-reference`\ncollection.';
    expect(markdownToPlainText(markdown, 78)).toBe('Reads the execution-reference collection.');
  });
});
