  -- The constraint the whole mechanism rests on. Scoped by organization and
  -- environment, so two merchants may use the same key text independently and a
  -- sandbox key can never collide with a production one.
  CONSTRAINT idempotency_key_is_unique_per_tenant
    UNIQUE (organization_id, environment, idempotency_key),

  CONSTRAINT idempotency_completed_shape CHECK (
    (state = 'completed') = (response_status IS NOT NULL AND completed_at IS NOT NULL)
  ),
