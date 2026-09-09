ALTER ROLE payment_gateway_application WITH
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOBYPASSRLS
  PASSWORD :'application_password';

GRANT CONNECT ON DATABASE :"database_name" TO payment_gateway_application;
GRANT USAGE ON SCHEMA public TO payment_gateway_application;

-- No CREATE on the schema. A SQL injection foothold in the application must not be
-- able to add a table, replace a function, or drop a policy.
REVOKE CREATE ON SCHEMA public FROM payment_gateway_application;
