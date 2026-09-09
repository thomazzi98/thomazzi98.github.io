  // Every candidate is compared, and the loop is not exited early on a mismatch, so the time taken
  // does not depend on which secret or which signature happened to match.
  let matched = false;
  for (const secret of input.secrets) {
    const expected = computeSignature(secret, identifier, timestamp, input.body);
    for (const candidate of presented) {
      matched = constantTimeEquals(expected, candidate) || matched;
    }
  }

  if (!matched) {
    return { kind: 'invalid', reason: 'no presented signature matched' };
  }
  return { kind: 'valid' };
