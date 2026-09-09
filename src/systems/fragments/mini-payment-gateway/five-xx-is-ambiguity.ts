  if (status >= 400 && status < 500) {
    return 'safe_failure';
  }

  // A 5xx says the provider broke, not that it did nothing. It may well have
  // committed the order and failed on the way back.
  return 'unknown_outcome';
