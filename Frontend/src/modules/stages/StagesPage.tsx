import React, { useEffect, useMemo, useState } from 'react';
import type { ProjectObject, Stage, StageStatus } from './types';
import { createStage, deleteStage, fetchObjectsForStages, fetchStages, updateStage } from './api';

const statusLabels: Record<StageStatus, string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Пауза',
  done: 'Завершено',
};

const StagesPage: React.FC = () => {
  const [objects, setObjects] = useState<ProjectObject[]>([]);
  const [objectId, setObjectId] = useState('');

  const [items, setItems] = useState<Stage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create
  const [creating, setCreating] = useState(false);
  const [cName, setCName] = useState('');
  const [cOrder, setCOrder] = useState('0');
  const [cStatus, setCStatus] = useState<StageStatus>('planned');
  const [cDesc, setCDesc] = useState('');

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState('');
  const [eOrder, setEOrder] = useState('0');
  const [eStatus, setEStatus] = useState<StageStatus>('planned');
  const [eDesc, setEDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedObjectName = useMemo(() => {
    return objects.find((o) => o.id === objectId)?.name ?? '';
  }, [objects, objectId]);

  async function loadObjects() {
    try {
      const data = await fetchObjectsForStages();
      setObjects(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження обʼєктів');
    }
  }

  async function loadStages(selectedObjectId: string) {
    if (!selectedObjectId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchStages(selectedObjectId);
      setItems(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження етапів');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadObjects();
  }, []);

  useEffect(() => {
    loadStages(objectId);
    // при зміні обʼєкта — скидаємо редагування
    setEditingId(null);
  }, [objectId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!objectId) return alert('Виберіть обʼєкт');
    if (!cName.trim()) return alert('Введіть назву етапу');

    const orderNum = Number(cOrder);
    if (!Number.isFinite(orderNum) || orderNum < 0) return alert('Order має бути числом >= 0');

    setCreating(true);
    try {
      const created = await createStage({
        objectId,
        name: cName.trim(),
        order: orderNum,
        status: cStatus,
        description: cDesc.trim() ? cDesc.trim() : undefined,
      });

      // вставка в список з урахуванням order
      setItems((prev) => {
        const next = [...prev, created];
        next.sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt));
        return next;
      });

      setCName('');
      setCOrder('0');
      setCStatus('planned');
      setCDesc('');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Не вдалося створити етап');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(s: Stage) {
    setEditingId(s.id);
    setEName(s.name ?? '');
    setEOrder(String(s.order ?? 0));
    setEStatus(s.status);
    setEDesc((s.description ?? '') as string);
  }

  function cancelEdit() {
    setEditingId(null);
    setEName('');
    setEOrder('0');
    setEStatus('planned');
    setEDesc('');
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    if (!eName.trim()) return alert('Введіть назву етапу');

    const orderNum = Number(eOrder);
    if (!Number.isFinite(orderNum) || orderNum < 0) return alert('Order має бути числом >= 0');

    setSaving(true);
    try {
      const updated = await updateStage(editingId, {
        name: eName.trim(),
        order: orderNum,
        status: eStatus,
        description: eDesc.trim() ? eDesc.trim() : undefined,
      });

      setItems((prev) => {
        const next = prev.map((x) => (x.id === updated.id ? updated : x));
        next.sort((a, b) => (a.order - b.order) || a.createdAt.localeCompare(b.createdAt));
        return next;
      });

      cancelEdit();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Не вдалося зберегти зміни');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    const ok = window.confirm('Видалити етап? Дію не можна буде скасувати.');
    if (!ok) return;

    try {
      await deleteStage(id);
      setItems((prev) => prev.filter((x) => x.id !== id));
      if (editingId === id) cancelEdit();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Не вдалося видалити етап');
    }
  }

  return (
    <div>
      <h1>Етапи</h1>

      {/* Вибір обʼєкта */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Обʼєкт</h3>
        <select value={objectId} onChange={(e) => setObjectId(e.target.value)}>
          <option value="">— Виберіть обʼєкт —</option>
          {objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {objectId && (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            Обрано: <b>{selectedObjectName}</b>
          </div>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {/* Створення */}
      <form onSubmit={onCreate} className="card" style={{ marginBottom: 16 }}>
        <h3>Додати етап</h3>

        <div className="form-grid">
          <input
            placeholder="Назва етапу *"
            value={cName}
            onChange={(e) => setCName(e.target.value)}
            disabled={!objectId || creating}
          />

          <input
            placeholder="Порядок (order)"
            value={cOrder}
            onChange={(e) => setCOrder(e.target.value)}
            disabled={!objectId || creating}
          />

          <select
            value={cStatus}
            onChange={(e) => setCStatus(e.target.value as StageStatus)}
            disabled={!objectId || creating}
          >
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <input
            placeholder="Опис (опційно)"
            value={cDesc}
            onChange={(e) => setCDesc(e.target.value)}
            disabled={!objectId || creating}
          />
        </div>

        <button type="submit" disabled={!objectId || creating}>
          {creating ? 'Створення…' : 'Створити етап'}
        </button>
      </form>

      {/* Список */}
      {isLoading ? (
        <p>Завантаження...</p>
      ) : !objectId ? (
        <p>Виберіть обʼєкт, щоб побачити етапи.</p>
      ) : items.length === 0 ? (
        <p>Поки немає етапів для цього обʼєкта.</p>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Назва</th>
              <th>Статус</th>
              <th>Опис</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => {
              const isEditing = editingId === s.id;

              return (
                <tr key={s.id}>
                  {!isEditing ? (
                    <>
                      <td>{s.order}</td>
                      <td>{s.name}</td>
                      <td>{statusLabels[s.status]}</td>
                      <td>{s.description || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button onClick={() => startEdit(s)}>Редагувати</button>{' '}
                        <button onClick={() => onDelete(s.id)}>Видалити</button>
                      </td>
                    </>
                  ) : (
                    <td colSpan={5}>
                      <form onSubmit={onSaveEdit} className="form-grid">
                        <input value={eOrder} onChange={(e) => setEOrder(e.target.value)} />
                        <input value={eName} onChange={(e) => setEName(e.target.value)} />
                        <select value={eStatus} onChange={(e) => setEStatus(e.target.value as StageStatus)}>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                        <input value={eDesc} onChange={(e) => setEDesc(e.target.value)} />

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button type="submit" disabled={saving}>
                            {saving ? 'Збереження…' : 'Зберегти'}
                          </button>
                          <button type="button" onClick={cancelEdit} disabled={saving}>
                            Скасувати
                          </button>
                        </div>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StagesPage;
