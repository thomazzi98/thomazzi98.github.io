import type { projectStatuses } from '../content/schemas';

export type ProjectStatus = (typeof projectStatuses)[number];

interface PeriodEnd {
  end: string | null;
}

export const describeStatus = (status: ProjectStatus, rolePeriod?: PeriodEnd): string => {
  if (status === 'in-production' && rolePeriod?.end !== undefined && rolePeriod.end !== null) {
    return `In production when I left (${rolePeriod.end})`;
  }
  return statusLabels[status];
};

export const statusLabels: Record<ProjectStatus, string> = {
  'in-production': 'In production',
  delivered: 'Delivered',
  'paused-by-client': 'Paused by client',
  'never-launched': 'Never launched',
  internal: 'Internal',
  personal: 'Personal',
};
