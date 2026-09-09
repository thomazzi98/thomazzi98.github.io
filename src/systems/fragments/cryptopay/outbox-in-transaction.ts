      const outbox = input.outbox;
      if (outbox !== null && outbox !== undefined) {
        // The uniqueness of (payment_id, event_type) is what makes a replayed transition produce one
        // notification rather than two. A conflict here is the ordinary path, not an error.
        await client.query(
          `INSERT INTO webhook_deliveries
             (id, merchant_id, payment_id, environment, event_type, destination_url, payload)
           VALUES ($1,$2,$3,$4::environment_name,$5,$6,$7)
           ON CONFLICT (payment_id, event_type) DO NOTHING`,
          [
            outbox.identifier,
            outbox.merchantId,
            payment.identifier,
            outbox.environment,
            outbox.eventType,
            outbox.destinationUrl,
            outbox.payload,
          ],
        );
      }
