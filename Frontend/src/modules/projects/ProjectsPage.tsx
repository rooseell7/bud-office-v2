import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { getForemanCandidates, type ForemanCandidate } from '../../api/objects';

/* ====== Типи ====== */

interface Client {
  id: number;
  name: string;
}

interface ProjectObject {
  id: number;
  name: string;
  type: 'apartment' | 'house' | 'commercial' | 'other';
  address?: string | null;
  status: 'planned' | 'in_progress' | 'paused' | 'done';
  clientId: number;
  foremanId?: number | null;
}

/* ====== Лейбли ====== */

const typeLabels: Record<ProjectObject['type'], string> = {
  apartment: 'Квартира',
  house: 'Будинок',
  commercial: 'Комерція',
  other: 'Інше',
};

const statusLabels: Record<ProjectObject['status'], string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Пауза',
  done: 'Завершено',
};

/* ====== Компонент ====== */

const ProjectsPage: React.FC = () => {
  const nav = useNavigate();
  const [objects, setObjects] = useState<ProjectObject[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ====== Форма створення ====== */
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [type, setType] = useState<ProjectObject['type']>('apartment');
  const [status, setStatus] = useState<ProjectObject['status']>('planned');
  // clientId може бути необов'язковим: обʼєкт можна створити без привʼязки до клієнта.
  // Якщо клієнта вибрано — передаємо тільки валідний int >= 1.
  const [clientId, setClientId] = useState<number | ''>('');
  const [foremanId, setForemanId] = useState<number | ''>('');
  const [foremanCandidates, setForemanCandidates] = useState<ForemanCandidate[]>([]);
  const [creating, setCreating] = useState(false);

  /* ====== Завантаження ====== */

  const loadObjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<ProjectObject[]>('/objects');
      setObjects(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження обʼєктів');
    } finally {
      setIsLoading(false);
    }
  };

  const loadForemanCandidates = async () => {
    try {
      const list = await getForemanCandidates();
      setForemanCandidates(list);
    } catch {
      // ignore
    }
  };

  const loadClients = async () => {
    try {
      const res = await api.get<any>('/clients');
      const data = res.data;
      // бек може повертати або масив, або пагінований формат { items, meta }
      const list: Client[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : [];
      setClients(list);
    } catch {
      // тут мовчки — без клієнтів обʼєкт все одно не створиться
    }
  };

  useEffect(() => {
    loadObjects();
    loadClients();
    loadForemanCandidates();
  }, []);

  /* ====== Створення ====== */

  const createObject = async (e: React.FormEvent) => {
    e.preventDefault();

    const cidRaw =
      typeof clientId === 'number'
        ? String(clientId)
        : String(clientId ?? '').trim();

    const cid = cidRaw ? Number.parseInt(cidRaw, 10) : NaN;
    const hasValidClient = Number.isFinite(cid) && cid >= 1;

    if (!name.trim()) {
      alert('Заповніть назву');
      return;
    }

    setCreating(true);
    try {
      const payload: any = {
        name: name.trim(),
        address: address?.trim() || undefined,
        type,
        status,
      };

      if (hasValidClient) payload.clientId = cid;
      if (foremanId !== '' && Number.isFinite(Number(foremanId))) payload.foremanId = Number(foremanId);

      const res = await api.post<ProjectObject>('/objects', payload);

      setObjects((prev) => [res.data, ...prev]);

      // очистка форми
      setName('');
      setAddress('');
      setType('apartment');
      setStatus('planned');
      setClientId('');
      setForemanId('');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Не вдалося створити обʼєкт');
    } finally {
      setCreating(false);
    }
  };

  /* ====== UI ====== */

  return (
    <div>
      <h1>Обʼєкти</h1>

      {/* ====== Форма створення ====== */}
      <form onSubmit={createObject} className="card" style={{ marginBottom: 20 }}>
        <h3>Додати обʼєкт</h3>

        <div className="form-grid">
          <input
            placeholder="Назва обʼєкта *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            placeholder="Адреса"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <select value={type} onChange={(e) => setType(e.target.value as any)}>
            {Object.entries(typeLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            {Object.entries(statusLabels).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={clientId === '' ? '' : String(clientId)}
            onChange={(e) => {
              const v = (e.target.value ?? '').toString();
              setClientId(v ? Number(v) : '');
            }}
          >
            <option value="">— Виберіть клієнта *</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={foremanId === '' ? '' : String(foremanId)}
            onChange={(e) => {
              const v = (e.target.value ?? '').toString();
              setForemanId(v ? Number(v) : '');
            }}
          >
            <option value="">— Виконроб (не обовʼязково)</option>
            {foremanCandidates.map((f) => (
              <option key={f.id} value={f.id}>
                {f.fullName}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={creating}>
          {creating ? 'Створення…' : 'Створити обʼєкт'}
        </button>
      </form>

      {/* ====== Список ====== */}
      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <p>Завантаження...</p>
      ) : objects.length === 0 ? (
        <p>Поки немає обʼєктів</p>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th>Назва</th>
              <th>Тип</th>
              <th>Адреса</th>
              <th>Статус</th>
              <th>Виконроб</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((o) => (
              <tr
                key={o.id}
                style={{ cursor: 'pointer' }}
                onClick={() => nav(`/projects/${o.id}`)}
                title="Відкрити обʼєкт"
              >
                <td>{o.name}</td>
                <td>{typeLabels[o.type]}</td>
                <td>{o.address || '—'}</td>
                <td>{statusLabels[o.status]}</td>
                <td>
                  {o.foremanId
                    ? foremanCandidates.find((f) => f.id === o.foremanId)?.fullName ?? `#${o.foremanId}`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectsPage;
