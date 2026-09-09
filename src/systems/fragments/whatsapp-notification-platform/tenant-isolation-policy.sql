        CREATE POLICY tenant_isolation ON %I FOR ALL TO PUBLIC
          USING (
            current_user <> 'platform_tenant'
            OR application_id = nullif(current_setting('app.current_application_id', true), '')::uuid
          )
          WITH CHECK (
            current_user <> 'platform_tenant'
            OR application_id = nullif(current_setting('app.current_application_id', true), '')::uuid
          )
