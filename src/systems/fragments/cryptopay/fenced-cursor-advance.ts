      const advanced = await client.query(
        `UPDATE block_cursors
            SET last_scanned_height = $2,
                last_scanned_reference = $3,
                finalized_height = COALESCE($4, finalized_height),
                finalized_advanced_at = CASE
                  WHEN $4 IS NOT NULL AND $4::bigint IS DISTINCT FROM finalized_height
                  THEN now()
                  ELSE finalized_advanced_at
                END,
                current_scan_range = $5,
                consecutive_successes = $6,
                updated_at = now()
          WHERE network_identifier = $1::network_identifier
            AND fencing_token = $7
            AND halted_at IS NULL`,
        [
          window.networkIdentifier,
          window.scannedThrough.position.height.toString(),
          window.scannedThrough.position.reference,
          window.finalizedHeight?.toString() ?? null,
          window.nextScanRange,
          window.consecutiveSuccesses,
          window.fencingToken.toString(),
        ],
      );

      if (advanced.rowCount === 0) {
        await client.query('ROLLBACK');
        return false;
      }
