    const orderReference = readOrderReference(order.body);
    if (orderReference === undefined) {
      // Nothing to correlate on. The order may or may not exist, and Appmax offers
      // no way to search for it, so this is reported as ambiguous rather than as a
      // failure and is never retried.
      return failureFrom(order, 'Appmax did not return an order identifier.');
    }
