export type Attachment = {
  id: number;
  entityType: string;
  entityId: number;
  kind: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedById: number | null;
  createdAt: string;
};
