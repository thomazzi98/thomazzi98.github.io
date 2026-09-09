-- A merchant reference identifies one live payment. Re-using it while an earlier
-- payment is still open is a duplicate, not a second payment; once the earlier one
-- is finished the reference is free again.
CREATE UNIQUE INDEX payments_one_live_per_merchant_reference
  ON payments (organization_id, environment, merchant_reference)
  WHERE status NOT IN ('failed', 'cancelled', 'expired', 'refunded');
