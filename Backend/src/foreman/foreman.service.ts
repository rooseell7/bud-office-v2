import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { ForemanEvent } from './foreman-event.entity';
import {
  ExecutionTask,
  ExecutionTaskStatus,
} from '../execution/execution-task.entity';
import { ExecutionTaskEvent, ExecutionTaskEventType } from '../execution/execution-task-event.entity';
import { ForemanEventType } from './foreman-event.entity';
import { CreateForemanEventDto } from './dto/create-foreman-event.dto';

export type ForemanObjectDto = {
  id: number;
  name: string;
  address?: string | null;
  status: string;
  updatedAt: string;
  openIssuesCount?: number;
  todayWorkLogsCount?: number;
  openTasksCount?: number;
  overdueTasksCount?: number;
};

export type ForemanTaskDto = {
  id: number;
  projectId: number;
  stageId: number | null;
  title: string;
  description: string | null;
  assigneeId: number;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
};

export type ForemanEventDto = {
  id: number;
  objectId: number;
  type: string;
  payload: Record<string, any> | null;
  createdById: number | null;
  createdAt: string;
};

@Injectable()
export class ForemanService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ForemanEvent)
    private readonly eventRepo: Repository<ForemanEvent>,
    @InjectRepository(ExecutionTask)
    private readonly taskRepo: Repository<ExecutionTask>,
    @InjectRepository(ExecutionTaskEvent)
    private readonly taskEventRepo: Repository<ExecutionTaskEvent>,
  ) {}

  async ensureForemanEventsTable(): Promise<void> {
    try {
      await this.dataSource.query(`
        CREATE TABLE IF NOT EXISTS foreman_events (
          id SERIAL PRIMARY KEY,
          "objectId" INT NOT NULL,
          type VARCHAR(64) NOT NULL,
          payload JSONB NULL,
          "createdById" INT NULL,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      await this.dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_foreman_events_object_created
        ON foreman_events ("objectId", "createdAt")
      `);
    } catch {
      // table may exist or sync handles it
    }
  }

  async findMyObjects(userId: number): Promise<ForemanObjectDto[]> {
    const projectIdsByForeman = await this.projectRepo
      .createQueryBuilder('p')
      .select('p.id')
      .where('p.foremanId = :userId', { userId })
      .getMany();
    const projectIdsByTask = await this.taskRepo
      .createQueryBuilder('t')
      .select('DISTINCT t.projectId')
      .where('t.assigneeId = :userId', { userId })
      .andWhere('t.status IN (:...statuses)', {
        statuses: [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED],
      })
      .getRawMany<{ projectId: number }>();
    const allIds = [
      ...new Set([
        ...projectIdsByForeman.map((p) => p.id),
        ...projectIdsByTask.map((r) => r.projectId),
      ]),
    ];
    if (allIds.length === 0) return [];

    const projects = await this.projectRepo.find({
      where: allIds.map((id) => ({ id })),
      order: { updatedAt: 'DESC' },
    });

    const openStatuses = [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED];
    const counts = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.projectId', 'projectId')
      .addSelect('COUNT(*) FILTER (WHERE t.status IN (:...open))', 'openCount')
      .addSelect(
        "COUNT(*) FILTER (WHERE t.dueDate IS NOT NULL AND t.dueDate < CURRENT_DATE AND t.status IN (:...open))",
        'overdueCount',
      )
      .where('t.projectId IN (:...ids)', { ids: allIds })
      .setParameter('open', openStatuses)
      .groupBy('t.projectId')
      .getRawMany<{ projectId: number; openCount: string; overdueCount: string }>();
    const countMap = new Map(
      counts.map((c) => [
        c.projectId,
        { open: parseInt(c.openCount, 10) || 0, overdue: parseInt(c.overdueCount, 10) || 0 },
      ]),
    );

    return projects.map((p) => {
      const c = countMap.get(p.id) ?? { open: 0, overdue: 0 };
      return {
        id: p.id,
        name: p.name ?? '',
        address: p.address ?? null,
        status: p.status ?? 'planned',
        updatedAt: p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        openIssuesCount: 0,
        todayWorkLogsCount: 0,
        openTasksCount: c.open,
        overdueTasksCount: c.overdue,
      };
    });
  }

  async findOneObject(id: number, userId: number): Promise<any> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Обʼєкт не знайдено');
    const isForeman = project.foremanId === userId;
    const hasTask = await this.taskRepo
      .createQueryBuilder('t')
      .where('t.projectId = :id', { id })
      .andWhere('t.assigneeId = :userId', { userId })
      .getCount();
    if (!isForeman && hasTask === 0) throw new NotFoundException('Обʼєкт не знайдено');
    return {
      id: project.id,
      name: project.name ?? '',
      address: project.address ?? null,
      status: project.status ?? 'planned',
      updatedAt: project.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async findEvents(
    objectId: number,
    userId: number,
    limit: number,
    before?: string,
  ): Promise<ForemanEventDto[]> {
    await this.findOneObject(objectId, userId);

    const qb = this.eventRepo
      .createQueryBuilder('e')
      .where('e.objectId = :objectId', { objectId })
      .orderBy('e.createdAt', 'DESC')
      .take(limit);

    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        qb.andWhere('e.createdAt < :before', { before: beforeDate });
      }
    }

    const events = await qb.getMany();
    return events.map((e) => ({
      id: e.id,
      objectId: e.objectId,
      type: e.type,
      payload: e.payload ?? null,
      createdById: e.createdById ?? null,
      createdAt: e.createdAt?.toISOString?.() ?? new Date().toISOString(),
    }));
  }

  async createEvent(
    objectId: number,
    userId: number,
    dto: CreateForemanEventDto,
  ): Promise<ForemanEventDto> {
    await this.findOneObject(objectId, userId);

    const event = this.eventRepo.create({
      objectId,
      type: dto.type,
      payload: dto.payload ?? null,
      createdById: userId,
    });
    const saved = await this.eventRepo.save(event);
    return {
      id: saved.id,
      objectId: saved.objectId,
      type: saved.type,
      payload: saved.payload ?? null,
      createdById: saved.createdById ?? null,
      createdAt: saved.createdAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  async findObjectTasks(
    objectId: number,
    userId: number,
    options?: { includeDone?: boolean },
  ): Promise<ForemanTaskDto[]> {
    await this.findOneObject(objectId, userId);

    const qb = this.taskRepo
      .createQueryBuilder('t')
      .where('t.projectId = :objectId', { objectId })
      .andWhere('t.assigneeId = :userId', { userId })
      .orderBy('t.createdAt', 'DESC');

    if (!options?.includeDone) {
      qb.andWhere('t.status IN (:...statuses)', {
        statuses: [ExecutionTaskStatus.NEW, ExecutionTaskStatus.IN_PROGRESS, ExecutionTaskStatus.BLOCKED],
      });
    }

    const tasks = await qb.getMany();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    return tasks.map((t) => {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      const isOverdue =
        due &&
        due.getTime() < todayStart &&
        ![ExecutionTaskStatus.DONE, ExecutionTaskStatus.CANCELED].includes(t.status as ExecutionTaskStatus);
      return {
        id: t.id,
        projectId: t.projectId,
        stageId: t.stageId,
        title: t.title,
        description: t.description ?? null,
        assigneeId: t.assigneeId,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : (t.dueDate as Date).toISOString().slice(0, 10)) : null,
        createdAt: t.createdAt?.toISOString?.() ?? '',
        updatedAt: t.updatedAt?.toISOString?.() ?? '',
        isOverdue: !!isOverdue,
      };
    });
  }

  async updateTaskStatus(
    taskId: number,
    userId: number,
    status: ExecutionTaskStatus,
    comment?: string,
    blockedReason?: string,
  ): Promise<ForemanTaskDto> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задачу не знайдено');
    if (task.assigneeId !== userId) throw new NotFoundException('Задачу не знайдено');
    await this.findOneObject(task.projectId, userId);

    const prevStatus = task.status;
    task.status = status;
    const saved = await this.taskRepo.save(task);

    const payload: Record<string, unknown> = { from: prevStatus, to: status };
    if (comment) payload.comment = comment;
    if (blockedReason) payload.blockedReason = blockedReason;

    await this.taskEventRepo.save(
      this.taskEventRepo.create({
        taskId: saved.id,
        type: ExecutionTaskEventType.STATUS_CHANGE,
        payload,
        createdById: userId,
      }),
    );
    await this.eventRepo.save(
      this.eventRepo.create({
        objectId: task.projectId,
        type: ForemanEventType.TASK_STATUS_CHANGE as any,
        payload: { taskId: saved.id, ...payload },
        createdById: userId,
      }),
    );

    const due = saved.dueDate ? new Date(saved.dueDate) : null;
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const isOverdue =
      due &&
      due.getTime() < todayStart &&
      ![ExecutionTaskStatus.DONE, ExecutionTaskStatus.CANCELED].includes(saved.status as ExecutionTaskStatus);

    return {
      id: saved.id,
      projectId: saved.projectId,
      stageId: saved.stageId,
      title: saved.title,
      description: saved.description ?? null,
      assigneeId: saved.assigneeId,
      status: saved.status,
      priority: saved.priority,
      dueDate: saved.dueDate ? (typeof saved.dueDate === 'string' ? saved.dueDate : (saved.dueDate as Date).toISOString().slice(0, 10)) : null,
      createdAt: saved.createdAt?.toISOString?.() ?? '',
      updatedAt: saved.updatedAt?.toISOString?.() ?? '',
      isOverdue: !!isOverdue,
    };
  }
}
