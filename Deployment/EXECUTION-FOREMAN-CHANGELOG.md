# Changelog: Відділ реалізації + інтеграція з кабінетом виконроба

## Встановлені канонічні речі (з ТЗ)

1. **Сутність об'єкта:** `Project` (таблиця `projects`), `id` — number. У API використовується `objectId` = `projects.id`.
2. **Виконроб на об'єкті:** поле `Project.foremanId` (number | null). Кабінет показує об'єкти де `foremanId = userId` або де користувач є виконавцем (assignee) хоча б однієї задачі.
3. **Stages:** таблиця `stages`, entity `Stage` з `objectId` → projects.id. Задачі мають `stageId` (nullable на MVP).

---

## Backend

### Permissions
- Додано `execution:read`, `execution:write`.
- Ролі: `delivery_head`, `delivery_manager` — execution:read + execution:write; `foreman` — execution:read (перегляд задач).

### Нові сутності та міграція
- **ExecutionTask** (`execution_tasks`): projectId, stageId?, title, description?, assigneeId, status (new|in_progress|blocked|done|canceled), priority, dueDate?, createdById, timestamps.
- **ExecutionTaskEvent** (`execution_task_events`): taskId, type (status_change|comment), payload (jsonb), createdById, createdAt.
- **ForemanEvent:** додано типи TASK_CREATED, TASK_STATUS_CHANGE, TASK_COMMENT для єдиного контуру подій у стрічці виконроба.

### API Execution (керівник реалізації)
- `GET /execution/projects` — список об'єктів (фільтри: status, foremanId, overdue).
- `GET /execution/projects/:id` — деталі об'єкта + задачі.
- `POST /execution/projects/:id/tasks` — створення задачі (side-effect: TaskEvent + ForemanEvent).
- `PATCH /execution/tasks/:taskId` — оновлення задачі (статус/поля).
- `POST /execution/tasks/:taskId/comments` — коментар до задачі.
- `GET /execution/tasks/:taskId/events` — події по задачі.

### API Foreman (кабінет виконроба)
- `GET /foreman/objects` — «мої об'єкти» (foremanId = userId або assignee активних задач); додано openTasksCount, overdueTasksCount.
- `GET /foreman/objects/:id/tasks` — задачі об'єкта для поточного виконроба (assigneeId = userId; за замовчуванням без done/canceled).
- `PATCH /foreman/tasks/:taskId/status` — зміна статусу (body: status, comment?, blockedReason?).

---

## Frontend

### Меню та роути
- Розділ «Відділ реалізації» видимий при `execution:read`; пункт «Об'єкти» → `/execution/projects`.
- Роути: `/execution/projects`, `/execution/projects/:id`.
- Кабінет виконроба — при `foreman:read` (без змін логіки видимості).

### Сторінки
- **ExecutionProjectsPage** — список об'єктів з фільтрами (статус, виконроб, прострочені), бейджі активних/прострочених задач.
- **ExecutionProjectDetailsPage** — вкладки «Задачі» (список, фільтр по статусу, кнопка «Створити задачу», швидка зміна статусу) та «Події» (стрічка з foreman_events, включно з подіями задач).
- **CreateTaskModal** — етап (опційно), назва, опис, виконроб, пріоритет, дедлайн.

### Кабінет виконроба
- **ForemanObjectsPage** — бейджі «Задач: N», «Прострочено: N».
- **ForemanObjectPage** — секція «Мої задачі» з кнопками «В роботу», «Очікування», «Готово»; стрічка подій показує TASK_CREATED, TASK_STATUS_CHANGE, TASK_COMMENT.

---

## Список змінених/нових файлів

### Backend (нові)
- `Backend/src/execution/execution-task.entity.ts`
- `Backend/src/execution/execution-task-event.entity.ts`
- `Backend/src/execution/execution.service.ts`
- `Backend/src/execution/execution.controller.ts`
- `Backend/src/execution/execution.module.ts`
- `Backend/src/execution/dto/create-execution-task.dto.ts`
- `Backend/src/execution/dto/update-execution-task.dto.ts`
- `Backend/src/execution/dto/task-comment.dto.ts`
- `Backend/src/execution/dto/foreman-task-status.dto.ts`
- `Backend/sql/2026-02-03_execution_tasks.sql`

### Backend (змінені)
- `Backend/src/auth/permissions/permissions.ts` — execution:read/write, прив’язка до ролей.
- `Backend/src/foreman/foreman-event.entity.ts` — типи TASK_*.
- `Backend/src/foreman/foreman.service.ts` — findMyObjects (задачі), findOneObject (доступ по assignee), findObjectTasks, updateTaskStatus.
- `Backend/src/foreman/foreman.controller.ts` — GET objects/:id/tasks, PATCH tasks/:taskId/status.
- `Backend/src/foreman/foreman.module.ts` — ExecutionTask, ExecutionTaskEvent.
- `Backend/src/app.module.ts` — ExecutionModule.

### Frontend (нові)
- `Frontend/src/api/execution.ts`
- `Frontend/src/modules/execution/pages/ExecutionProjectsPage.tsx`
- `Frontend/src/modules/execution/pages/ExecutionProjectDetailsPage.tsx`
- `Frontend/src/modules/execution/components/CreateTaskModal.tsx`

### Frontend (змінені)
- `Frontend/src/App.tsx` — роути execution/projects, execution/projects/:id.
- `Frontend/src/modules/layout/MainLayout.tsx` — меню «Відділ реалізації» (execution:read), пункт «Об'єкти».
- `Frontend/src/api/foreman.ts` — ForemanTaskDto, getForemanObjectTasks, updateForemanTaskStatus.
- `Frontend/src/modules/foreman/pages/ForemanObjectsPage.tsx` — бейджі задач/прострочено.
- `Frontend/src/modules/foreman/pages/ForemanObjectPage.tsx` — блок «Мої задачі», кнопки статусів, події TASK_* у стрічці.
