import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document } from '../documents/document.entity';
import { Project } from '../projects/project.entity';
import { buildFromTemplate } from '../sheets/templates/buildFromTemplate';

@Injectable()
export class EstimatesService {
  constructor(
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
  ) {}

  async findByProject(projectId: number, limit = 50) {
    const rows = await this.docRepo.find({
      where: { type: 'quote', projectId },
      order: { updatedAt: 'DESC' },
      take: Math.min(limit, 100),
    });
    return rows.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      title: d.title ?? `КП #${d.id}`,
      status: d.status,
      updatedAt: d.updatedAt,
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

    return docs.map((d) => ({
      id: d.id,
      projectId: d.projectId,
      projectName: d.projectId != null ? projectMap.get(d.projectId) ?? null : null,
      title: d.title ?? `КП #${d.id}`,
      status: d.status,
      updatedAt: d.updatedAt,
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
}
