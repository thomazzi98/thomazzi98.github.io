const STRATEGIES: Readonly<Record<NetworkFamily, AddressStrategy>> = Object.freeze({
  polygon: Object.freeze({
    kind: 'public-key-only',
    fromSeed: (seed: Buffer) => new HierarchicalDeterministicAllocator(seed, 'polygon'),
  }),
  tron: Object.freeze({
    kind: 'public-key-only',
    fromSeed: (seed: Buffer) => new HierarchicalDeterministicAllocator(seed, 'tron'),
  }),
  solana: Object.freeze({
    kind: 'requires-seed',
    deriveWithSeed: allocateSolanaDestination,
  }),
});
