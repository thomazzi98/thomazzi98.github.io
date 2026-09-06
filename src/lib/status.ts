import type { projectStatuses } from '../content/schemas';

export type ProjectStatus = (typeof projectStatuses)[number];

export const statusLabels: Record<ProjectStatus, string> = {
  'in-production': 'In production',
  'paused-by-client': 'Paused by client',
  'never-launched': 'Never launched',
  internal: 'Internal',
  personal: 'Personal',
};
