import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Project } from '../projects/project.entity';
import { User } from '../users/user.entity';
import { buildFromTemplate } from '../sheets/templates/buildFromTemplate';

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
    const users = await this.userRepo.find({ where: { id: In(ids) }, select: ['id', 'fullName', 'email'] });
    return new Map(users.map((u) => [u.id, u.fullName || u.email || '—']));
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

  async create(
    payload: { projectId: number; title?: string },
    userId: number | null,
  ) {
    const { projectId, title } = payload;
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проєкт не знайдено');

    const count = await this.docRepo.count({
      where: { type: 'quote', projectId },
    });
    const nextNum = count + 1;
    const docTitle = title?.trim() || `КП №${nextNum}`;

    const snapshot = buildFromTemplate('quote');
    const doc = await this.docRepo.save(
      this.docRepo.create({
        type: 'quote',
        title: docTitle,
        status: 'draft',
        projectId,
        meta: {
          sheetSnapshot: snapshot,
          sheetRevision: 1,
          templateVersion: (snapshot as any).templateVersion,
        },
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
    const doc = await this.docRepo.findOne({ where: { id, type: 'quote' } });
    if (!doc) throw new NotFoundException('КП не знайдено');
    await this.docRepo.remove(doc);
    return { ok: true };
  }
}
