  -- The monotonicity guarantee. There is no ('paid','awaiting_payment') row in
  -- legal_payment_transitions, so a stale expiry or a replayed webhook is refused
  -- by a foreign key regardless of what the application believes.
  CONSTRAINT transitions_must_be_legal
    FOREIGN KEY (from_status, to_status, trigger_name)
    REFERENCES legal_payment_transitions (from_status, to_status, trigger_name),

  -- Appmax webhooks carry no signature. A webhook may schedule a read; only the
  -- read can fund a payment. Enforced here rather than trusted to the caller.
  CONSTRAINT transitions_into_funds_require_authenticated_read CHECK (
    to_status NOT IN ('paid', 'partially_refunded', 'refunded', 'chargeback')
    OR evidence_class IN ('authenticated_provider_read', 'operator')
  )
