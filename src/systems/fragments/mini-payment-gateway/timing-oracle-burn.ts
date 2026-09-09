  const stored = await dependencies.repository.findByIdentifier(parsed.identifier);

  if (stored === undefined) {
    // Burn the same work an existing key would have cost before refusing.
    // Without this an unknown identifier returns before any HMAC is computed,
    // while a known one pays for it, and the difference is measurable — which
    // turns the endpoint into an oracle for which identifiers exist.
    hashApiKeySecret(parsed.identifier, parsed.secret, dependencies.pepper);
    return rejected('unknown_key');
  }
