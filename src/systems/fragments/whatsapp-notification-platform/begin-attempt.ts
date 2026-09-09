    const [updated] = await executor
      .update(notifications)
      .set({ attemptCount: sql`${notifications.attemptCount} + 1`, updatedAt: input.now })
      .where(
        and(
          eq(notifications.id, input.notificationId),
          eq(notifications.applicationId, input.applicationId),
          eq(notifications.claimToken, input.claimToken),
          eq(notifications.status, 'PROCESSING'),
        ),
      )
      .returning({ attemptCount: notifications.attemptCount });

    return updated?.attemptCount;
