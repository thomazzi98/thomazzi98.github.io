import { describe, expect, it } from 'vitest';
import {
  type HastNode,
  rehypeDropNestedHeadingIds,
  rehypeWrapDiagrams,
} from '../../src/lib/rehype';

const element = (
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): HastNode => ({ type: 'element', tagName, properties, children });

describe('rehypeDropNestedHeadingIds', () => {
  it('removes ids from fourth-level headings and deeper, and keeps the rest', () => {
    const tree: HastNode = {
      type: 'root',
      children: [
        element('h2', { id: 'context' }),
        element('section', {}, [element('h4', { id: 'outcomes' }), element('h5', { id: 'deep' })]),
      ],
    };
    rehypeDropNestedHeadingIds()(tree);
    expect(tree.children?.[0]?.properties).toEqual({ id: 'context' });
    expect(tree.children?.[1]?.children?.map((child) => child.properties)).toEqual([{}, {}]);
  });
});

describe('rehypeWrapDiagrams', () => {
  it('wraps a Mermaid svg in a figure and leaves other svgs alone', () => {
    const diagram = element('svg', { ariaRoledescription: 'flowchart-v2' });
    const icon = element('svg', { className: ['icon'] });
    const tree: HastNode = { type: 'root', children: [element('p', {}, [icon]), diagram] };
    rehypeWrapDiagrams()(tree);
    expect(tree.children?.[1]).toEqual({
      type: 'element',
      tagName: 'figure',
      properties: { className: ['diagram'] },
      children: [diagram],
    });
    expect(tree.children?.[0]?.children?.[0]).toBe(icon);
  });
});
