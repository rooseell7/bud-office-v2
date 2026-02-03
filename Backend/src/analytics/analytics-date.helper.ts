/**
 * Парсинг і валідація дат для аналітики. Усі endpoints приймають from, to, groupBy.
 */
export type GroupBy = 'day' | 'week' | 'month';

export function parseDateRange(from?: string, to?: string): { fromDate: Date; toDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let fromDate: Date;
  let toDate: Date;

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    fromDate = new Date(from + 'T00:00:00');
    if (isNaN(fromDate.getTime())) fromDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    toDate = new Date(to + 'T23:59:59');
    if (isNaN(toDate.getTime())) toDate = new Date(today);
  } else {
    toDate = new Date(today);
    toDate.setHours(23, 59, 59, 999);
  }

  if (fromDate.getTime() > toDate.getTime()) {
    const swap = fromDate;
    fromDate = toDate;
    toDate = swap;
  }
  return { fromDate, toDate };
}

export function parseGroupBy(groupBy?: string): GroupBy {
  if (groupBy === 'week' || groupBy === 'month') return groupBy;
  return 'day';
}

/** Для PostgreSQL date truncation: day -> date, week -> date_trunc('week', date), month -> date_trunc('month', date) */
export function getDateTruncSql(groupBy: GroupBy, dateColumn: string): string {
  switch (groupBy) {
    case 'week':
      return `date_trunc('week', ${dateColumn}::date)::date`;
    case 'month':
      return `date_trunc('month', ${dateColumn}::date)::date`;
    default:
      return `${dateColumn}::date`;
  }
}
