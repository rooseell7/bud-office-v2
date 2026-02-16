-- Прив'язка клієнта до об'єкта (проєкту) — зберігається на сервері, доступна всім користувачам.
-- Об'єкти = таблиця project.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS object_id integer NULL;

COMMENT ON COLUMN clients.object_id IS 'ID об''єкта (project) для прив''язки клієнта; NULL = не прив''язано';
