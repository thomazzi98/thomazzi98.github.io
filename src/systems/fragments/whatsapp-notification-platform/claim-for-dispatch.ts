  public async claimForDispatch(
    applicationId: string,
    notificationId: string,
    claimToken: string,
    now: Date,
  ): Promise<NotificationRecord | undefined> {
    const [claimed] = await this.database
      .update(notifications)
      .set({ status: 'PROCESSING', claimToken, claimedAt: now, updatedAt: now })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.applicationId, applicationId),
          inArray(notifications.status, ['QUEUED', 'RETRYING']),
        ),
      )
      .returning();

    return claimed as NotificationRecord | undefined;
  }
