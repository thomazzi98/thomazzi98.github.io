interface TechnologyEntry {
  id: string;
  data: { name: string };
}

interface Reference {
  id: string;
}

export type TechnologyName = (reference: Reference) => string;

export const createTechnologyNameLookup = (registry: TechnologyEntry[]): TechnologyName => {
  const namesById = new Map(registry.map((entry) => [entry.id, entry.data.name]));
  return (reference) => {
    const name = namesById.get(reference.id);
    if (name === undefined) {
      throw new Error(`Unknown technology "${reference.id}"`);
    }
    return name;
  };
};
