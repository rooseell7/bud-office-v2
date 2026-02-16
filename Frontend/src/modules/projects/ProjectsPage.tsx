import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { getForemanCandidates, deleteObject, type ForemanCandidate } from '../../api/objects';
import { useAuth } from '../auth/AuthContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

/* ====== Типи ====== */

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
  const { roles, can } = useAuth();
  const realtime = useRealtime();
  const isAdmin = Array.isArray(roles) && roles.map((r) => String(r).toLowerCase()).includes('admin');
  const canCreateObject = can('objects:create');
  const [objects, setObjects] = useState<ProjectObject[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foremanCandidates, setForemanCandidates] = useState<ForemanCandidate[]>([]);

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

  useEffect(() => {
    loadObjects();
    loadForemanCandidates();
  }, []);

  useEffect(() => {
    if (!realtime) return;
    return realtime.subscribeInvalidateAll(loadObjects);
  }, [realtime]);

  const handleDelete = async () => {
    if (deleteId == null) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await deleteObject(deleteId);
      setDeleteId(null);
      await loadObjects();
    } catch (e: any) {
      setDeleteError(e?.response?.data?.message || e?.message || 'Помилка видалення');
    } finally {
      setDeleteBusy(false);
    }
  };

  /* ====== UI ====== */

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ margin: 0 }}>Обʼєкти</h1>
        {canCreateObject && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => nav('/sales/objects/new')}
          >
            Додати обʼєкт
          </Button>
        )}
      </div>

      {/* ====== Список ====== */}
      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <p>Завантаження...</p>
      ) : objects.length === 0 ? (
        <p>Поки немає обʼєктів</p>
      ) : (
        <>
        <table className="list-table">
          <thead>
            <tr>
              <th>Назва</th>
              <th>Тип</th>
              <th>Адреса</th>
              <th>Статус</th>
              <th>Виконроб</th>
              {isAdmin && <th style={{ width: 100, textAlign: 'right' }}>Дії</th>}
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
                {isAdmin && (
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setDeleteId(o.id)}
                      title="Видалити обʼєкт"
                    >
                      Видалити
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {isAdmin && deleteId != null && (
          <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} role="dialog">
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Видалити обʼєкт?</h5>
                  <button type="button" className="btn-close" onClick={() => !deleteBusy && setDeleteId(null)} aria-label="Close" />
                </div>
                <div className="modal-body">
                  {deleteError && <div className="alert alert-danger">{deleteError}</div>}
                  <p>Обʼєкт буде видалено безповоротно. Продовжити?</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDeleteId(null)} disabled={deleteBusy}>
                    Скасувати
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => void handleDelete()} disabled={deleteBusy}>
                    {deleteBusy ? 'Видалення…' : 'Видалити'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default ProjectsPage;
