-- Reads the organization for the current transaction.
--
-- Returns NULL when nothing has been set, and `organization_id = NULL` is NULL
-- rather than true, so an unscoped connection sees zero rows. The failure mode of
-- forgetting to set the context is an empty result, never a leak.
CREATE FUNCTION current_organization_id() RETURNS UUID
  LANGUAGE sql
  STABLE
  -- Pinned so a caller cannot shadow a referenced object with one of their own.
  SET search_path = pg_catalog, public
AS $$
  SELECT NULLIF(current_setting('app.organization_id', true), '')::uuid
$$;
