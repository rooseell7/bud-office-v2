import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/project.entity';
import { ExecutionTask, ExecutionTaskStatus, ExecutionTaskPriority } from './execution-task.entity';
import { ExecutionTaskEvent, ExecutionTaskEventType } from './execution-task-event.entity';
import { ForemanEvent, ForemanEventType } from '../foreman/foreman-event.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateExecutionTaskDto } from './dto/create-execution-task.dto';
import { UpdateExecutionTaskDto } from './dto/update-execution-task.dto';
import { TaskCommentDto } from './dto/task-comment.dto';
import type { DomainEvent } from '../realtime/domain-event.types';

export type ExecutionProjectListItem = {
  id: number;
  name: string;
  status: string;
  foremanId: number | null;
  openTasksCount: number;
  overdueTasksCount: number;
  updatedAt: string;
};

export type ExecutionTaskDto = {
  id: number;
  projectId: number;
  stageId: number | null;
  title: string;
  description: string | null;
  assigneeId: number;
  assigneeName?: string;
  status: ExecutionTaskStatus;
  priority: string;
  dueDate: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  isOverdue?: boolean;
};

export type ExecutionTaskEventDto = {
  id: number;
  taskId: number;
  type: string;
  payload: Record<string, unknown> | null;
  createdById: number | null;
  createdAt: string;
};

@Injectable()
export class ExecutionService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ExecutionTask)
    private readonly taskRepo: Repository<ExecutionTask>,
    @InjectRepository(ExecutionTaskEvent)
    private readonly taskEventRepo: Repository<ExecutionTaskEvent>,
    @InjectRepository(ForemanEvent)
    private readonly foremanEventRepo: Repository<ForemanEvent>,
    private readonly realtime: RealtimeService,
  ) {}

  private toInt(value: unknown, field: string): number {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
      throw new BadRequestException(`${field} має бути цілим числом > 0`);
    }
    return n;
  }

  private async assertProjectAccess(projectId: number, userId: number): Promise<Project> {
    const project = await this.projectRepo.findOne({ where: { id: projectId, userId } });
    if (!project) throw new NotFoundException('Обʼєкт не знайдено');
    return project;
  }

  async getProjects(
    userId: number,
    filters?: { status?: string; foremanId?: number; overdueOnly?: boolean },
  ): Promise<ExecutionProjectListItem[]> {
    const qb = this.projectRepo
      .createQueryBuilder('p')
      .where('p.userId = :userId', { userId })
      .orderBy('p.updatedAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('p.status = :status', { status: filters.status });
    }
    if (filters?.foremanId != null) {
      qb.andWhere('p.foremanId = :foremanId', { foremanId: filters.foremanId });
    }

    const projects = await qb.getMany();
    const ids = projects.map((p) => p.id);
    if (ids.length === 0) {
      return projects.map((p) => ({
        id: p.id,
        name: p.name ?? '',
        status: p.status ?? 'planned',
        foremanId: p.foremanId ?? null,
        openTasksCount: 0,
        overdueTasksCount: 0,
        updatedAt: p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      }));
    }

    const openStatuses = [
      ExecutionTaskStatus.NEW,
      ExecutionTaskStatus.IN_PROGRESS,
      ExecutionTaskStatus.BLOCKED,
    ];
    const counts = await this.taskRepo
      .createQueryBuilder('t')
      .select('t.projectId', 'projectId')
      .addSelect('COUNT(*) FILTER (WHERE t.status IN (:...open))', 'openCount')
      .addSelect(
        "COUNT(*) FILTER (WHERE t.dueDate IS NOT NULL AND t.dueDate < CURRENT_DATE AND t.status IN (:...open))",
        'overdueCount',
      )
      .where('t.projectId IN (:...ids)', { ids })
      .setParameter('open', openStatuses)
      .groupBy('t.projectId')
      .getRawMany<{ projectId: number; openCount: string; overdueCount: string }>();

    const countMap = new Map(
      counts.map((c) => [
        c.projectId,
        { open: parseInt(c.openCount, 10) || 0, overdue: parseInt(c.overdueCount, 10) || 0 },
      ]),
    );

    let list: ExecutionProjectListItem[] = projects.map((p) => {
      const c = countMap.get(p.id) ?? { open: 0, overdue: 0 };
      return {
        id: p.id,
        name: p.name ?? '',
        status: p.status ?? 'planned',
        foremanId: p.foremanId ?? null,
        openTasksCount: c.open,
        overdueTasksCount: c.overdue,
        updatedAt: p.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      };
    });

    if (filters?.overdueOnly) {
      list = list.filter((p) => p.overdueTasksCount > 0);
    }

    return list;
  }

  async getProjectById(projectId: number, userId: number): Promise<{
    project: Project;
    tasks: ExecutionTaskDto[];
  }> {
    const project = await this.assertProjectAccess(projectId, userId);
    const tasks = await this.taskRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    });
    const assigneeIds = [...new Set(tasks.map((t) => t.assigneeId))];
    const users =
      assigneeIds.length > 0
        ? await this.projectRepo.manager.query(
            'SELECT id, "fullName" FROM users WHERE id = ANY($1)',
            [assigneeIds],
          )
        : [];
    const userMap = new Map<number, string>(users.map((u: { id: number; fullName: string }) => [u.id, u.fullName]));

    const taskDtos: ExecutionTaskDto[] = tasks.map((t) => {
      const due = t.dueDate ? new Date(t.dueDate) : null;
      const isOverdue =
        due &&
        due.getTime() < new Date().setHours(0, 0, 0, 0) &&
        ![ExecutionTaskStatus.DONE, ExecutionTaskStatus.CANCELED].includes(
          t.status as ExecutionTaskStatus,
        );
      return {
        id: t.id,
        projectId: t.projectId,
        stageId: t.stageId,
        title: t.title,
        description: t.description ?? null,
        assigneeId: t.assigneeId,
        assigneeName: userMap.get(t.assigneeId) ?? undefined,
        status: t.status as ExecutionTaskStatus,
        priority: t.priority as string,
        dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : (t.dueDate as Date).toISOString().slice(0, 10)) : null,
        createdById: t.createdById,
        createdAt: t.createdAt?.toISOString?.() ?? '',
        updatedAt: t.updatedAt?.toISOString?.() ?? '',
        isOverdue: !!isOverdue,
      };
    });

    return { project, tasks: taskDtos };
  }

  private async pushTimelineEvent(
    objectId: number,
    type: ForemanEventType,
    payload: Record<string, unknown> | null,
    createdById: number,
  ): Promise<void> {
    const ev = this.foremanEventRepo.create({
      objectId,
      type: type as any,
      payload,
      createdById,
    });
    await this.foremanEventRepo.save(ev);
  }

  async createTask(
    projectId: number,
    userId: number,
    dto: CreateExecutionTaskDto,
  ): Promise<ExecutionTaskDto> {
    await this.assertProjectAccess(projectId, userId);

    const task = this.taskRepo.create({
      projectId,
      stageId: dto.stageId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      assigneeId: dto.assigneeId,
      status: ExecutionTaskStatus.NEW,
      priority: dto.priority ?? ExecutionTaskPriority.MEDIUM,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      createdById: userId,
    });
    const saved = await this.taskRepo.save(task) as ExecutionTask;

    await this.taskEventRepo.save(
      this.taskEventRepo.create({
        taskId: saved.id,
        type: ExecutionTaskEventType.STATUS_CHANGE,
        payload: { from: null, to: ExecutionTaskStatus.NEW, comment: 'Створено' },
        createdById: userId,
      }),
    );
    await this.pushTimelineEvent(
      projectId,
      ForemanEventType.TASK_CREATED,
      { taskId: saved.id, title: saved.title, assigneeId: saved.assigneeId },
      userId,
    );

    const ev: DomainEvent = {
      eventId: crypto.randomUUID(),
      ts: new Date().toISOString(),
      actorId: userId,
      entity: 'task',
      action: 'created',
      entityId: saved.id,
      projectId,
      payload: { title: saved.title },
      eventVersion: 1,
    };
    this.realtime.broadcast(ev, [`project:${projectId}`, 'module:execution']);

    return this.taskToDto(saved, null);
  }

  async updateTask(
    taskId: number,
    userId: number,
    dto: UpdateExecutionTaskDto,
  ): Promise<ExecutionTaskDto> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задачу не знайдено');
    await this.assertProjectAccess(task.projectId, userId);

    const prevStatus = task.status;
    if (dto.stageId !== undefined) task.stageId = dto.stageId ?? null;
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description ?? null;
    if (dto.assigneeId !== undefined) task.assigneeId = dto.assigneeId;
    if (dto.status !== undefined) task.status = dto.status as ExecutionTaskStatus;
    if (dto.priority !== undefined) task.priority = dto.priority;
    if (dto.dueDate !== undefined) task.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;

    const saved = await this.taskRepo.save(task);

    if (dto.status !== undefined && dto.status !== prevStatus) {
      await this.taskEventRepo.save(
        this.taskEventRepo.create({
          taskId: saved.id,
          type: ExecutionTaskEventType.STATUS_CHANGE,
          payload: { from: prevStatus, to: dto.status },
          createdById: userId,
        }),
      );
      await this.pushTimelineEvent(
        task.projectId,
        ForemanEventType.TASK_STATUS_CHANGE,
        { taskId: saved.id, from: prevStatus, to: dto.status },
        userId,
      );
    }

    const ev: DomainEvent = {
      eventId: crypto.randomUUID(),
      ts: new Date().toISOString(),
      actorId: userId,
      entity: 'task',
      action: dto.status !== undefined && dto.status !== prevStatus ? 'status_changed' : 'updated',
      entityId: saved.id,
      projectId: task.projectId,
      payload: dto.status !== undefined ? { status: dto.status } : undefined,
      eventVersion: 1,
    };
    this.realtime.broadcast(ev, [`project:${task.projectId}`, 'module:execution']);

    return this.taskToDto(saved, null);
  }

  async addTaskComment(
    taskId: number,
    userId: number,
    dto: TaskCommentDto,
  ): Promise<ExecutionTaskEventDto> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задачу не знайдено');
    await this.assertProjectAccess(task.projectId, userId);

    const comment = dto.comment?.trim() ?? '';
    const event = this.taskEventRepo.create({
      taskId,
      type: ExecutionTaskEventType.COMMENT,
      payload: { comment },
      createdById: userId,
    });
    const saved = await this.taskEventRepo.save(event);
    await this.pushTimelineEvent(
      task.projectId,
      ForemanEventType.TASK_COMMENT,
      { taskId, comment },
      userId,
    );

    const ev: DomainEvent = {
      eventId: crypto.randomUUID(),
      ts: new Date().toISOString(),
      actorId: userId,
      entity: 'task',
      action: 'updated',
      entityId: taskId,
      projectId: task.projectId,
      payload: { comment: true },
      eventVersion: 1,
    };
    this.realtime.broadcast(ev, [`project:${task.projectId}`, 'module:execution']);

    return {
      id: saved.id,
      taskId: saved.taskId,
      type: saved.type,
      payload: saved.payload ?? null,
      createdById: saved.createdById ?? null,
      createdAt: saved.createdAt?.toISOString?.() ?? '',
    };
  }

  async getTaskEvents(taskId: number, userId: number): Promise<ExecutionTaskEventDto[]> {
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Задачу не знайдено');
    await this.assertProjectAccess(task.projectId, userId);

    const events = await this.taskEventRepo.find({
      where: { taskId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return events.map((e) => ({
      id: e.id,
      taskId: e.taskId,
      type: e.type,
      payload: e.payload ?? null,
      createdById: e.createdById ?? null,
      createdAt: e.createdAt?.toISOString?.() ?? '',
    }));
  }

  private taskToDto(t: ExecutionTask, assigneeName?: string | null): ExecutionTaskDto {
    const due = t.dueDate ? new Date(t.dueDate) : null;
    const isOverdue =
      due &&
      due.getTime() < new Date().setHours(0, 0, 0, 0) &&
      ![ExecutionTaskStatus.DONE, ExecutionTaskStatus.CANCELED].includes(t.status as ExecutionTaskStatus);
    return {
      id: t.id,
      projectId: t.projectId,
      stageId: t.stageId,
      title: t.title,
      description: t.description ?? null,
      assigneeId: t.assigneeId,
      assigneeName: assigneeName ?? undefined,
      status: t.status as ExecutionTaskStatus,
      priority: t.priority,
      dueDate: t.dueDate ? (typeof t.dueDate === 'string' ? t.dueDate : (t.dueDate as Date).toISOString().slice(0, 10)) : null,
      createdById: t.createdById,
      createdAt: t.createdAt?.toISOString?.() ?? '',
      updatedAt: t.updatedAt?.toISOString?.() ?? '',
      isOverdue: !!isOverdue,
    };
  }
}
