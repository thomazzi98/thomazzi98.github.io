  async claim(
    workerIdentity: string,
    networkIdentifier: NetworkIdentifier,
    limit: number,
    leaseSeconds: number,
  ): Promise<readonly string[]> {
    const result = await this.pool.query<{ payment_id: string }>(
      `UPDATE payment_evaluation_queue queue
          SET locked_by = $1, locked_until = now() + make_interval(secs => $3)
        WHERE queue.payment_id IN (
          SELECT candidate.payment_id
            FROM payment_evaluation_queue candidate
            JOIN payments ON payments.id = candidate.payment_id
           WHERE (candidate.locked_until IS NULL OR candidate.locked_until < now())
             AND payments.network_identifier = $4::network_identifier
           ORDER BY candidate.enqueued_at, candidate.payment_id
           FOR UPDATE OF candidate SKIP LOCKED
           LIMIT $2
        )
      RETURNING queue.payment_id`,
      [workerIdentity, limit, leaseSeconds, networkIdentifier],
    );
    return result.rows.map((row) => row.payment_id);
  }
