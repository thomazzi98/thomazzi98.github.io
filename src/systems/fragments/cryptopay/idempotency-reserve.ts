  async reserve(request: ReservationRequest): Promise<ReservationOutcome> {
    const fingerprint = fingerprintRequest(request.method, request.path, request.body);
    const ownerToken = randomBytes(16).toString('hex');

    // A single statement does the whole decision. ON CONFLICT DO UPDATE claims an abandoned
    // reservation whose lock has expired, and its WHERE clause is what stops it claiming a live one.
    const claimed = await this.pool.query<{ claimed: boolean }>(
      `INSERT INTO idempotency_keys
         (merchant_id, environment, idempotency_key, request_method, request_path,
          request_fingerprint, state, lock_expires_at, expires_at, owner_token)
       VALUES ($1, $8::environment_name, $2, $3, $4, $5, 'in_progress',
               now() + make_interval(secs => $6), now() + make_interval(hours => $7), $9)
       ON CONFLICT (merchant_id, environment, idempotency_key) DO UPDATE
         SET lock_expires_at = now() + make_interval(secs => $6),
             request_fingerprint = EXCLUDED.request_fingerprint,
             owner_token = EXCLUDED.owner_token
         WHERE idempotency_keys.state = 'in_progress'
           AND idempotency_keys.lock_expires_at <= now()
           AND idempotency_keys.request_fingerprint = EXCLUDED.request_fingerprint
       RETURNING true AS claimed`,
      [
        request.merchantId,
        request.idempotencyKey,
        request.method,
        request.path,
        fingerprint,
        LOCK_SECONDS,
        RETENTION_HOURS,
        request.environment,
        ownerToken,
      ],
    );

    if (claimed.rows.length > 0) {
      return { kind: 'reserved', ownerToken };
    }
