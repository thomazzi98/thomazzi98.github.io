export const notificationStatusTransitions = {
  SCHEDULED: ['QUEUED', 'CANCELLED'],
  QUEUED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SENT', 'RETRYING', 'FAILED'],
  SENT: ['DELIVERED', 'FAILED'],
  DELIVERED: [],
  RETRYING: ['PROCESSING', 'CANCELLED', 'FAILED'],
  FAILED: [],
  CANCELLED: [],
} as const satisfies Record<NotificationStatus, readonly NotificationStatus[]>;
