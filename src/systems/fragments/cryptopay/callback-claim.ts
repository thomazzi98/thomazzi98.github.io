  async claimDue(
    workerIdentity: string,
    limit: number,
    leaseSeconds: number,
  ): Promise<readonly WebhookDelivery[]> {
    const result = await this.pool.query<DeliveryRow>(
      `WITH due AS (
         SELECT DISTINCT ON (candidate.merchant_id, candidate.environment)
                candidate.id, candidate.next_attempt_at
           FROM webhook_deliveries candidate
          WHERE candidate.status IN ('pending', 'failed')
            AND candidate.next_attempt_at <= now()
            AND NOT EXISTS (
              SELECT 1 FROM webhook_deliveries busy
               WHERE busy.merchant_id = candidate.merchant_id
                 AND busy.environment = candidate.environment
                 AND busy.status = 'in_flight'
            )
          ORDER BY candidate.merchant_id, candidate.environment, candidate.next_attempt_at,
                   candidate.id
       )
       UPDATE webhook_deliveries
          SET status = 'in_flight',
              claimed_by = $1,
              claim_expires_at = now() + make_interval(secs => $3),
              updated_at = now()
        WHERE id IN (SELECT id FROM due ORDER BY next_attempt_at, id LIMIT $2)
      RETURNING ${DELIVERY_COLUMNS}`,
      [workerIdentity, limit, leaseSeconds],
    );
    return result.rows.map((row) => toDelivery(row));
  }
