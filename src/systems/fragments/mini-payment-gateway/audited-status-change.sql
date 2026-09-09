-- A status change without a matching, legal, evidence-backed transition row
-- cannot commit. This is what stops a sixth uncoordinated write path from ever
-- existing: it is not discouraged, it is rejected.
CREATE OR REPLACE FUNCTION assert_payment_status_change_is_audited() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.status_sequence IS NOT DISTINCT FROM OLD.status_sequence THEN
    RETURN NULL;
  END IF;

  IF NEW.status_sequence = 0 AND TG_OP = 'INSERT' THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM payment_status_transitions
     WHERE payment_id = NEW.id
       AND sequence_number = NEW.status_sequence
       AND to_status = NEW.status
  ) THEN
    RAISE EXCEPTION
      'unaudited_payment_status_change payment=% status=% sequence=%',
      NEW.id, NEW.status, NEW.status_sequence
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER payments_status_change_is_audited
  AFTER INSERT OR UPDATE OF status, status_sequence ON payments
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_payment_status_change_is_audited();
