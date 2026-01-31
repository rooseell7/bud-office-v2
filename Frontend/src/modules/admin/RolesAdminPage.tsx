// src/modules/admin/RolesAdminPage.tsx
import React from 'react';
import api from '../../api/client';
import { Role } from './types';

const RolesAdminPage: React.FC = () => {
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.get<Role[]>('/roles');
      setRoles(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження ролей');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--primary">
        <h2>Ролі</h2>
        <p>Список доступних ролей у системі BUD Office.</p>

        {loading && <p style={{ fontSize: 13 }}>Завантаження…</p>}
        {error && (
          <p style={{ fontSize: 13, color: '#f97373', marginTop: 6 }}>{error}</p>
        )}

        <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Код</th>
                <th>Назва</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.code}</td>
                  <td>{r.name}</td>
                </tr>
              ))}
              {roles.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', fontSize: 13 }}>
                    Ролей ще немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h3>Як ми будемо розширювати ролі</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Поки що ролі створюються з бекенду (ти вже маєш admin, estimator,
          foreman, supply_manager тощо). Пізніше тут з’явиться:
        </p>
        <ul className="admin-list">
          <li>• Створення нових ролей з фронту</li>
          <li>• Прив’язка прав доступу до окремих модулів (постачання, акти…)</li>
          <li>• Швидке призначення ролей групам користувачів</li>
        </ul>
      </section>
    </div>
  );
};

export default RolesAdminPage;
