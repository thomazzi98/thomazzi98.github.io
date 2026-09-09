  -- ===================================================================
  -- The legacy system encoded paid-ness twice, as `status` and `paidAt`, and five
  -- uncoordinated code paths wrote them independently until they disagreed. Here
  -- there is one source of truth — captured_amount_minor — and the other two are
  -- constrained to agree with it. Those legacy UPDATE statements, run verbatim
  -- against this schema, abort with check_violation.
  -- ===================================================================
  CONSTRAINT payments_paid_at_agrees_with_capture CHECK (
    (paid_at IS NOT NULL) = (captured_amount_minor > 0)
  ),
  CONSTRAINT payments_status_agrees_with_capture CHECK (
    (captured_amount_minor > 0) =
      (status IN ('paid', 'partially_refunded', 'refunded', 'chargeback'))
  ),
