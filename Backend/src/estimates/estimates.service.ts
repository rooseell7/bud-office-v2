import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Document } from '../documents/document.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { buildFromTemplate } from '../sheets/templates/buildFromTemplate';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

export type EstimateStage = {
  id: string;
  name: string;
  order: number;
  worksSheet?: Record<string, any>;
  materialsSheet?: Record<string, any>;
  worksRevision?: number;
  materialsRevision?: number;
};

function generateStageId(): string {
  return `stg_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function emptyWorksSheet(): Record<string, any> {
  return buildFromTemplate('quote-works');
}

function emptyMaterialsSheet(): Record<string, any> {
  return buildFromTemplate('quote-materials');
}

/** Міграція: legacy sheetSnapshot → stages */
function migrateLegacyToStages(meta: Record<string, any> | null): EstimateStage[] {
  const stages = meta?.stages;
  if (Array.isArray(stages) && stages.length > 0) {
    return stages as EstimateStage[];
  }
  const legacy = meta?.sheetSnapshot;
  if (legacy && typeof legacy === 'object') {
    return [
      {
        id: generateStageId(),
        name: 'Етап 1',
        order: 0,
        worksSheet: legacy,
        materialsSheet: emptyMaterialsSheet(),
        worksRevision: meta?.sheetRevision ?? 1,
        materialsRevision: 1,
      },
    ];
  }
  return [
    {
      id: generateStageId(),
      name: 'Етап 1',
      order: 0,
      worksSheet: emptyWorksSheet(),
      materialsSheet: emptyMaterialsSheet(),
      worksRevision: 1,
      materialsRevision: 1,
    },
  ];
}

/** Парсинг docKey: estimate:{id}:stage:{stageId}:works|materials */
function parseDocKey(docKey: string): { estimateId: number; stageId: string; sheetType: 'works' | 'materials' } | null {
  const parts = docKey.split(':');
  if (parts.length !== 5 || parts[0] !== 'estimate' || (parts[4] !== 'works' && parts[4] !== 'materials')) {
    return null;
  }
  const estimateId = parseInt(parts[1], 10);
  if (!Number.isFinite(estimateId)) return null;
  return { estimateId, stageId: parts[3], sheetType: parts[4] as 'works' | 'materials' };
}

@Injectable()
export class EstimatesService {
  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  private async getCreatedByMap(
    docs: { createdById?: number | null }[],
  ): Promise<Map<number, string>> {
    const ids = [...new Set(docs.map((d) => d.createdById).filter((id): id is number => id != null))];
    if (ids.length === 0) return new Map();
    const users = await this.userRepo.find({
      where: { id: In(ids) },
      select: ['id', 'fullName', 'email'],
    });
    return new Map(users.map((u) => [u.id, u.fullName || u.email || '—']));
  }

  private async getDoc(id: number): Promise<Document> {
    const doc = await this.docRepo.findOne({ where: { id, type: 'quote' } });
    if (!doc) throw new NotFoundException('КП не знайдено');
    return doc;
  }

  private ensureAndSaveStages(doc: Document, stages: EstimateStage[]): Promise<Document> {
    const meta = (doc as any).meta ?? {};
    const nextMeta = { ...meta, stages };
    if (meta.sheetSnapshot && !meta.stages) {
      delete (nextMeta as any).sheetSnapshot;
      delete (nextMeta as any).sheetRevision;
    }
    (doc as any).meta = nextMeta;
    return this.docRepo.save(doc);
  }

  async findByProject(projectId: number, limit = 50) {
    const rows = await this.docRepo.find({
      where: { type: 'quote', projectId },
      order: { updatedAt: 'DESC' },
      take: Math.min(limit, 100),
    });

    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    const projectName = project?.name ?? null;
    const createdByMap = await this.getCreatedByMap(rows);

    return rows.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectName,
      title: d.title ?? `КП #${d.id}`,
      status: d.status,
      updatedAt: d.updatedAt,
      createdByName: d.createdById != null ? createdByMap.get(d.createdById) ?? null : null,
    }));
  }

  async findRecent(limit = 10) {
    const docs = await this.docRepo.find({
      where: { type: 'quote' },
      order: { updatedAt: 'DESC' },
      take: Math.min(limit, 50),
    });

    const projectIds = [...new Set(docs.map((d) => d.projectId).filter(Boolean))] as number[];
    const projects =
      projectIds.length > 0
        ? await this.projectRepo.find({ where: { id: In(projectIds) } })
        : [];
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    const createdByMap = await this.getCreatedByMap(docs);

    return docs.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.projectId != null ? projectMap.get(d.projectId) ?? null : null,
      title: d.title ?? `КП #${d.id}`,
      status: d.status,
      updatedAt: d.updatedAt,
      createdByName: d.createdById != null ? createdByMap.get(d.createdById) ?? null : null,
    }));
  }

  async create(payload: { projectId: number; title?: string }, userId: number | null) {
    const { projectId, title } = payload;
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');

    const count = await this.docRepo.count({ where: { type: 'quote', projectId } });
    const nextNum = count + 1;
    const docTitle = title?.trim() || `КП №${nextNum}`;

    const stages: EstimateStage[] = [
      {
        id: generateStageId(),
        name: 'Етап 1',
        order: 0,
        worksSheet: emptyWorksSheet(),
        materialsSheet: emptyMaterialsSheet(),
        worksRevision: 1,
        materialsRevision: 1,
      },
    ];

    const doc = await this.docRepo.save(
      this.docRepo.create({
        type: 'quote',
        title: docTitle,
        status: 'draft',
        projectId,
        meta: { stages },
        createdById: userId,
      }),
    );
    return {
      id: doc.id,
      projectId: doc.projectId,
      title: doc.title,
    };
  }

  async delete(id: number) {
    const doc = await this.getDoc(id);
    await this.docRepo.remove(doc);
    return { ok: true };
  }

  /** Повертає документ з етапами (для редактора). Міграція legacy → stages. */
  async getDocumentWithStages(id: number) {
    const doc = await this.getDoc(id);
    const meta = (doc as any).meta ?? {};
    let stages = migrateLegacyToStages(meta);
    if (!Array.isArray(meta.stages) || meta.stages.length === 0) {
      await this.ensureAndSaveStages(doc, stages);
    }
    return {
      id: doc.id,
      type: doc.type,
      title: doc.title,
      status: doc.status,
      projectId: doc.projectId,
      meta: doc.meta,
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  async createStage(estimateId: number, dto: CreateStageDto) {
    const doc = await this.getDoc(estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const maxOrder = stages.reduce((m, s) => Math.max(m, s.order), -1);
    const newStage: EstimateStage = {
      id: generateStageId(),
      name: dto.name?.trim() || `Етап ${stages.length + 1}`,
      order: dto.order ?? maxOrder + 1,
      worksSheet: emptyWorksSheet(),
      materialsSheet: emptyMaterialsSheet(),
      worksRevision: 1,
      materialsRevision: 1,
    };
    stages.push(newStage);
    stages.sort((a, b) => a.order - b.order);
    await this.ensureAndSaveStages(doc, stages);
    return { id: newStage.id, name: newStage.name, order: newStage.order };
  }

  async updateStage(estimateId: number, stageId: string, dto: UpdateStageDto) {
    const doc = await this.getDoc(estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx < 0) throw new NotFoundException('Етап не знайдено');
    if (dto.name !== undefined) stages[idx].name = String(dto.name).trim() || stages[idx].name;
    if (dto.order !== undefined) stages[idx].order = dto.order;
    stages.sort((a, b) => a.order - b.order);
    await this.ensureAndSaveStages(doc, stages);
    return { id: stages[idx].id, name: stages[idx].name, order: stages[idx].order };
  }

  async deleteStage(estimateId: number, stageId: string) {
    const doc = await this.getDoc(estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const filtered = stages.filter((s) => s.id !== stageId);
    if (filtered.length === stages.length) throw new NotFoundException('Етап не знайдено');
    if (filtered.length === 0) throw new BadRequestException('Не можна видалити останній етап');
    await this.ensureAndSaveStages(doc, filtered);
    return { ok: true };
  }

  /** Дублювати етап: назва + "(копія)", копія worksSheet + materialsSheet + styles */
  async duplicateStage(estimateId: number, stageId: string) {
    const doc = await this.getDoc(estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const idx = stages.findIndex((s) => s.id === stageId);
    if (idx < 0) throw new NotFoundException('Етап не знайдено');
    const src = stages[idx] as EstimateStage;
    const newId = generateStageId();
    const maxOrder = stages.reduce((m, s) => Math.max(m, s.order), -1);
    const copySheet = (sheet: Record<string, any> | undefined): Record<string, any> => {
      if (!sheet || typeof sheet !== 'object') return emptyWorksSheet();
      const raw = sheet.rawValues as string[][] | undefined;
      const vals = sheet.values as string[][] | undefined;
      const styles = sheet.styles as Record<string, any> | undefined;
      const cellComments = sheet.cellComments as Record<string, string> | undefined;
      const rowIds = Array.isArray(sheet.rowIds)
        ? sheet.rowIds.map(() => generateRowId())
        : Array.from({ length: (raw ?? vals ?? [[]]).length }, () => generateRowId());
      return {
        ...sheet,
        rawValues: raw ? raw.map((r) => [...r]) : sheet.rawValues,
        values: vals ? vals.map((r) => [...r]) : sheet.values,
        styles: styles ? { ...styles } : sheet.styles,
        cellComments: cellComments ? { ...cellComments } : sheet.cellComments,
        rowIds,
      };
    };
    const newStage: EstimateStage = {
      id: newId,
      name: (src.name || 'Етап').trim() + ' (копія)',
      order: maxOrder + 1,
      worksSheet: copySheet(src.worksSheet),
      materialsSheet: copySheet(src.materialsSheet),
      worksRevision: 1,
      materialsRevision: 1,
    };
    stages.push(newStage);
    stages.sort((a, b) => a.order - b.order);
    await this.ensureAndSaveStages(doc, stages);
    return { id: newStage.id, name: newStage.name, order: newStage.order };
  }

  /** Отримати snapshot за docKey. */
  async getSheetByDocKey(docKey: string): Promise<{ snapshot: Record<string, any>; revision: number } | null> {
    const parsed = parseDocKey(docKey);
    if (!parsed) return null;
    const doc = await this.docRepo.findOne({ where: { id: parsed.estimateId, type: 'quote' } });
    if (!doc) return null;
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const stage = stages.find((s) => s.id === parsed.stageId);
    if (!stage) return null;
    const sheet =
      parsed.sheetType === 'works' ? stage.worksSheet : stage.materialsSheet;
    const rev =
      parsed.sheetType === 'works' ? (stage.worksRevision ?? 1) : (stage.materialsRevision ?? 1);
    const snap = sheet && typeof sheet === 'object' ? sheet : parsed.sheetType === 'works' ? emptyWorksSheet() : emptyMaterialsSheet();
    return { snapshot: snap, revision: rev };
  }

  /** Зберегти snapshot за docKey. */
  async saveSheetByDocKey(
    docKey: string,
    snapshot: Record<string, any>,
    expectedRevision?: number,
  ): Promise<{ revision: number }> {
    const parsed = parseDocKey(docKey);
    if (!parsed) throw new BadRequestException('Невірний docKey');
    const doc = await this.getDoc(parsed.estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const idx = stages.findIndex((s) => s.id === parsed.stageId);
    if (idx < 0) throw new NotFoundException('Етап не знайдено');

    const revKey = parsed.sheetType === 'works' ? 'worksRevision' : 'materialsRevision';
    const sheetKey = parsed.sheetType === 'works' ? 'worksSheet' : 'materialsSheet';
    const currentRev = (stages[idx] as any)[revKey] ?? 1;
    if (expectedRevision !== undefined && currentRev !== expectedRevision) {
      throw new ConflictException('Revision conflict');
    }

    (stages[idx] as any)[sheetKey] = snapshot;
    (stages[idx] as any)[revKey] = currentRev + 1;
    await this.ensureAndSaveStages(doc, stages);
    return { revision: currentRev + 1 };
  }

  /** Експорт КП в XLSX (по етапах: кожен етап = 2 аркуші: Роботи + Матеріали) */
  async exportXlsx(estimateId: number): Promise<Buffer> {
    const doc = await this.getDoc(estimateId);
    const meta = (doc as any).meta ?? {};
    const stages = migrateLegacyToStages(meta) as EstimateStage[];
    const wb = XLSX.utils.book_new();

    for (const stage of stages) {
      const safeName = (stage.name || 'Етап').replace(/[*?:/\\[\]]/g, '_').slice(0, 31);
      for (const [sheetType, sheet, title] of [
        ['works', stage.worksSheet, 'Роботи'],
        ['materials', stage.materialsSheet, 'Матеріали'],
      ] as const) {
        const snap = sheet && typeof sheet === 'object' ? sheet : sheetType === 'works' ? emptyWorksSheet() : emptyMaterialsSheet();
        const cols = snap.columns ?? [];
        const values = snap.values ?? snap.rawValues ?? [];
        const colCount = snap.colCount ?? cols.length ?? (values[0]?.length ?? 0);
        const headers = cols.map((c: any) => c?.title ?? '');
        const wsData: (string | number)[][] = headers.some(Boolean) ? [headers] : [];
        for (const row of values) {
          const r = Array(colCount)
            .fill('')
            .map((_, i) => row?.[i] ?? '');
          wsData.push(r);
        }
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const sheetName = `${safeName} - ${title}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      }
    }

    if (wb.SheetNames.length === 0) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['(порожньо)']]), 'КП');
    }
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
