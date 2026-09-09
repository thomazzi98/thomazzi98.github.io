export async function withTenantScope<T>(
  database: Database,
  applicationId: string,
  work: (transaction: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`SET LOCAL ROLE platform_tenant`);
    await transaction.execute(
      sql`SELECT set_config('app.current_application_id', ${applicationId}, true)`,
    );

    return work(transaction);
  });
}
