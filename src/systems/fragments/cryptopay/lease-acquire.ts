  async acquire(
    leaseName: string,
    holderIdentity: string,
    durationSeconds: number,
  ): Promise<Lease | null> {
    const result = await this.pool.query<LeaseRow>(
      `INSERT INTO leader_leases (lease_name, holder_identity, fencing_token, acquired_at, expires_at)
       VALUES ($1, $2, 1, now(), now() + make_interval(secs => $3))
       ON CONFLICT (lease_name) DO UPDATE
         SET holder_identity = EXCLUDED.holder_identity,
             fencing_token   = leader_leases.fencing_token + 1,
             acquired_at     = now(),
             expires_at      = EXCLUDED.expires_at
         WHERE leader_leases.expires_at <= now()
            OR leader_leases.holder_identity = EXCLUDED.holder_identity
       RETURNING lease_name, holder_identity, fencing_token, acquired_at, expires_at`,
      [leaseName, holderIdentity, durationSeconds],
    );

    const row = result.rows[0];
    if (row === undefined) {
      return null;
    }
    return toLease(row);
  }
