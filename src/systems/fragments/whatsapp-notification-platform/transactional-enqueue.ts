export async function enqueueInTransaction(
  boss: PgBoss,
  transaction: DrizzleTransactionLike,
  queueName: QueueName,
  data: object,
  options: SendOptions = {},
): Promise<string | null> {
  return boss.send(queueName, data, {
    ...options,
    // eslint-disable-next-line unicorn/name-replacements -- pg-boss option name.
    db: fromDrizzle(transaction, sql),
  });
}
