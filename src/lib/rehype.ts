export interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const nestedHeadingTags = new Set(['h4', 'h5', 'h6']);

const isDiagram = (node: HastNode): boolean =>
  node.tagName === 'svg' &&
  Object.keys(node.properties ?? {}).some((key) => key.toLowerCase() === 'ariaroledescription');

const walk = (node: HastNode, visit: (node: HastNode) => void): void => {
  visit(node);
  for (const child of node.children ?? []) {
    walk(child, visit);
  }
};

export const rehypeDropNestedHeadingIds = () => (tree: HastNode) => {
  walk(tree, (node) => {
    if (node.tagName === undefined || !nestedHeadingTags.has(node.tagName)) {
      return;
    }
    delete node.properties?.id;
  });
};

export const rehypeWrapDiagrams = () => (tree: HastNode) => {
  walk(tree, (node) => {
    if (node.tagName === 'figure') {
      return;
    }
    node.children = node.children?.map((child) =>
      isDiagram(child)
        ? {
            type: 'element',
            tagName: 'figure',
            properties: { className: ['diagram'] },
            children: [child],
          }
        : child,
    );
  });
};
