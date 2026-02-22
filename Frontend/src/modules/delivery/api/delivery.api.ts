import { apiClient } from '../../../shared/api/apiClient';
import type { CreateWorkLogDto, UpdateWorkLogDto, WorkLog, Id } from '../types/work-log.types';

function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toId(value: unknown): Id {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value;
  return toNumber(value, 0);
}

function toIdOrNull(value: unknown): Id | null {
  if (value === null || value === undefined) return null;
  return toId(value);
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function toNote(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? value : undefined;
}

function ensureIsoDate(value: unknown): string {
  // приймаємо ISO або Date-string; якщо пусто — сьогодні
  const s = typeof value === 'string' ? value : '';
  if (s && !Number.isNaN(Date.parse(s))) return new Date(s).toISOString();

  return new Date().toISOString();
}

function mapWorkLog(raw: Record<string, unknown>): WorkLog {
  const qty = toNumber(raw?.qty ?? raw?.quantity, 0);
  const price = toNumber(raw?.price ?? raw?.unitPrice, 0);
  const total = toNumber(raw?.total ?? (qty * price), qty * price);

  return {
    id: toId(raw?.id),
    projectId: toId(raw?.projectId ?? raw?.project_id ?? raw?.project),
    stageId: toIdOrNull(raw?.stageId ?? raw?.stage_id ?? null),
    title: String(raw?.title ?? raw?.name ?? raw?.workName ?? ''),
    qty,
    unit: String(raw?.unit ?? raw?.unitName ?? ''),
    price,
    total,
    workDate: ensureIsoDate(raw?.workDate ?? raw?.work_date ?? raw?.date),
    note: toNote(raw?.note ?? raw?.comment ?? null),
    createdAt: toStringOrUndefined(raw?.createdAt ?? raw?.created_at),
    updatedAt: toStringOrUndefined(raw?.updatedAt ?? raw?.updated_at),
  };
}

/**
 * УВАГА: маршрути підстав під свої бекенд-ендпоїнти, якщо вони відрізняються.
 * Нижче — типовий варіант:
 * GET    /delivery/:projectId/work-logs
 * POST   /delivery/:projectId/work-logs
 * PATCH  /delivery/work-logs/:id
 * DELETE /delivery/work-logs/:id
 */

export async function getWorkLogs(projectId: Id): Promise<WorkLog[]> {
  const { data } = await apiClient.get(`/delivery/${projectId}/work-logs`);
  const arr = Array.isArray(data) ? data : (data?.items ?? []);
  return arr.map(mapWorkLog);
}

export async function createWorkLog(projectId: Id, dto: Omit<CreateWorkLogDto, 'projectId'>): Promise<WorkLog> {
  const payload: CreateWorkLogDto = {
    projectId,
    ...dto,
  };

  // total рахуємо на бекенді або фронті — тут не обов’язково
  const { data } = await apiClient.post(`/delivery/${projectId}/work-logs`, payload);
  return mapWorkLog(data);
}

export async function updateWorkLog(id: Id, dto: UpdateWorkLogDto): Promise<WorkLog> {
  const { data } = await apiClient.patch(`/delivery/work-logs/${id}`, dto);
  return mapWorkLog(data);
}

export async function deleteWorkLog(id: Id): Promise<void> {
  await apiClient.delete(`/delivery/work-logs/${id}`);
}