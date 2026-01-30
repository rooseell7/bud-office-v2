import React, { useEffect, useState } from 'react';
import type { Role } from '../auth/types';
import { fetchRoles } from '../../api/client';

const AdminRolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchRoles();
        setRoles(data);
      } catch (e) {
        console.error(e);
        setError('Не вдалося завантажити ролі.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Довідник ролей</h2>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          maxWidth: 480,
        }}
      >
        {loading ? (
          <div style={{ fontSize: 14 }}>Завантаження...</div>
        ) : (
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 13,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>ID</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Код</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Назва</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td style={{ padding: 8 }}>{role.id}</td>
                  <td style={{ padding: 8 }}>{role.code}</td>
                  <td style={{ padding: 8 }}>{role.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p style={{ fontSize: 12, marginTop: 12, opacity: 0.7 }}>
          Список ролей зараз береться з бекенда (таблиця <code>roles</code>).
          Далі можемо додати створення/редагування ролей окремо в адмінці.
        </p>
      </div>
    </div>
  );
};

export default AdminRolesPage;
