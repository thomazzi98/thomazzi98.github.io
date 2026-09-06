const buildDate = new Date();

export const buildYearMonth = buildDate.toISOString().slice(0, 7);

export const buildDateLabel = buildDate.toISOString().slice(0, 10);
