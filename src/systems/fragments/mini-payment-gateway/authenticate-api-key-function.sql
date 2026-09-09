-- Authenticating a request is the one lookup that cannot already know its own
-- tenant: the organization is the result of the lookup, not an input to it.
--
-- SECURITY DEFINER runs this single function as the owner so it can read the row,
-- while the table itself stays closed to the application role. It takes the unique
-- key identifier, so it can return at most one row and cannot be used to enumerate.
-- It returns the stored hash, never a secret; the caller compares in constant time.
CREATE FUNCTION authenticate_api_key(candidate_identifier TEXT)
RETURNS TABLE (
  api_key_id       UUID,
  organization_id  UUID,
  environment      environment,
  key_hash         BYTEA,
  scopes           TEXT[],
  revoked_at       TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  organization_archived_at TIMESTAMPTZ
)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = pg_catalog, public
AS $$
  SELECT
    api_keys.id,
    api_keys.organization_id,
    api_keys.environment,
    api_keys.key_hash,
    api_keys.scopes,
    api_keys.revoked_at,
    api_keys.expires_at,
    organizations.archived_at
  FROM api_keys
  JOIN organizations ON organizations.id = api_keys.organization_id
  WHERE api_keys.key_identifier = candidate_identifier
$$;
