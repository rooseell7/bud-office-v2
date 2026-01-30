export type StageStatus = 'planned' | 'in_progress' | 'paused' | 'done';

export type Stage = {
  id: string;
  name: string;
  description?: string | null;
  status: StageStatus;
  order: number;
  objectId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectObject = {
  id: string;
  name: string;
};
