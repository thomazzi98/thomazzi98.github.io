  public async currentToken(): Promise<Secret> {
    const held = this.#held;
    if (held !== undefined && this.clock.now() < held.renewAtMilliseconds) {
      return held.accessToken;
    }

    // Every caller that arrives while a fetch is running awaits that same fetch.
    this.#inFlight ??= this.fetchAndHold();

    try {
      return await this.#inFlight;
    } finally {
      this.#inFlight = undefined;
    }
  }
