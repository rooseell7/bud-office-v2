export type Id = string | number;

export interface WorkLog {
  id: Id;

  // ідентифікатор проекту (те, що підставляється у /delivery/:projectId)
  projectId: Id;

  // якщо в бекенді є прив’язка до етапу (stage), залишаємо optional
  stageId?: Id | null;

  // назва роботи
  title: string;

  // кількість + одиниця виміру
  qty: number;
  unit: string;

  // ціни
  price: number;
  total: number;

  // дати (ISO string)
  workDate: string;

  // метадані (optional)
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkLogDto {
  projectId: Id;
  stageId?: Id | null;
  title: string;
  qty: number;
  unit: string;
  price: number;
  workDate: string;
  note?: string | null;
}

export interface UpdateWorkLogDto {
  stageId?: Id | null;
  title?: string;
  qty?: number;
  unit?: string;
  price?: number;
  workDate?: string;
  note?: string | null;
}