export const wrapLine = (line: string, width: number, continuationIndent = ''): string[] => {
  const words = line.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= width || current.length === 0) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = `${continuationIndent}${word}`;
  }
  if (current.length > 0) {
    lines.push(current);
  }
  return lines;
};

const joinListItems = (lines: string[]): string[] => {
  const items: string[] = [];
  for (const line of lines) {
    if (line.startsWith('- ')) {
      items.push(line.slice(2).trim());
      continue;
    }
    const last = items.pop();
    if (last === undefined) {
      continue;
    }
    items.push(`${last} ${line.trim()}`);
  }
  return items;
};

const renderBlock = (block: string, width: number): string => {
  const lines = block.split('\n');
  const first = lines[0] ?? '';
  if (first.startsWith('## ')) {
    return first.slice(3).toUpperCase();
  }
  if (first.startsWith('- ')) {
    return joinListItems(lines)
      .flatMap((item) => wrapLine(`- ${item}`, width, '  '))
      .join('\n');
  }
  return wrapLine(lines.join(' '), width).join('\n');
};

export const markdownToPlainText = (markdown: string, width = 78): string =>
  markdown
    .trim()
    .split(/\n\s*\n/)
    .map((block) => renderBlock(block, width))
    .join('\n\n')
    .replaceAll('`', '');
