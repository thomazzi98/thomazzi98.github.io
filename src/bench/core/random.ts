export interface Random {
  next(): number;
  between(minimum: number, maximum: number): number;
  pick<Item>(items: readonly Item[]): Item;
}

const uint32 = 0x100000000;

export const createRandom = (seed: number): Random => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / uint32;
  };
  return {
    next,
    between: (minimum, maximum) => minimum + next() * (maximum - minimum),
    pick: (items) => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) {
        throw new RangeError('Cannot pick from an empty list.');
      }
      return item;
    },
  };
};

export const seedFromText = (text: string): number => {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};
