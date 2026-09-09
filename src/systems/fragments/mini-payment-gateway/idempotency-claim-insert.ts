    const claim = await client.query<{ id: string }>(
      `INSERT INTO idempotency_records
         (organization_id, environment, idempotency_key, request_fingerprint, request_path, state)
       VALUES ($1, $2, $3, $4, $5, 'in_flight')
       ON CONFLICT (organization_id, environment, idempotency_key) DO NOTHING
       RETURNING id`,
      [
        command.organizationId,
        command.environment,
        command.idempotencyKey,
        fingerprint,
        command.requestPath,
      ],
    );

    const claimedRecordId = claim.rows[0]?.id;
    if (claimedRecordId === undefined) {
      return this.decideForClaimHeldByAnother(client, command, fingerprint);
    }
