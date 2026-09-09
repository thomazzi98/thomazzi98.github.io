-- The double-spend guard, and the reason this table exists at all.
--
-- At most one live transaction per account and sequence number. A replacement is legitimate and
-- deliberately reuses the number with a higher fee, so the original is marked 'replaced' in the same
-- database transaction that inserts its successor; a replacement written any other way is refused
-- here rather than discovered as two mined transfers.
CREATE UNIQUE INDEX chain_transactions_live_sequence
  ON chain_transactions (network_identifier, source_account, sequence_number)
  WHERE status <> 'replaced' AND status <> 'dropped';
