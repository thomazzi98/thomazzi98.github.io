-- The callback worker: the outbox and the signing secrets. Nothing else exists as far as it is
-- concerned, and the payload it needs is already inside the delivery row.
GRANT CONNECT ON DATABASE cryptopay TO cryptopay_callback_worker;
GRANT USAGE ON SCHEMA public TO cryptopay_callback_worker;
GRANT SELECT, UPDATE ON webhook_deliveries TO cryptopay_callback_worker;
GRANT SELECT, INSERT ON webhook_delivery_attempts TO cryptopay_callback_worker;
GRANT SELECT ON webhook_secrets TO cryptopay_callback_worker;
GRANT USAGE, SELECT ON SEQUENCE webhook_delivery_attempts_id_seq TO cryptopay_callback_worker;
