import React, { useEffect, useState } from 'react';
import type { User, Role } from '../auth/types';
import { fetchUsers, fetchRoles, createUser } from '../../api/client';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersData, rolesData] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (e) {
      console.error(e);
      setError('Не вдалося завантажити користувачів або ролі.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleRole = (code: string) => {
    setSelectedRoles((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      setError('Заповни email, ПІБ та пароль.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createUser({
        email,
        password,
        fullName,
        rolesCodes: selectedRoles,
      });

      setEmail('');
      setFullName('');
      setPassword('');
      setSelectedRoles([]);

      await loadData();
    } catch (e) {
      console.error(e);
      setError('Помилка при створенні користувача.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 16 }}>Користувачі та ролі</h2>

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

      {/* Форма створення */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          maxWidth: 520,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          Створити користувача
        </h3>
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              ПІБ
            </label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: 8, fontSize: 14 }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Ролі</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {roles.map((role) => (
                <label
                  key={role.id}
                  style={{
                    fontSize: 13,
                    padding: '4px 8px',
                    borderRadius: 16,
                    border: '1px solid #e5e7eb',
                    backgroundColor: selectedRoles.includes(role.code)
                      ? '#cdd629'
                      : '#f9fafb',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role.code)}
                    onChange={() => toggleRole(role.code)}
                    style={{ marginRight: 4 }}
                  />
                  {role.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: 999,
              border: 'none',
              backgroundColor: '#0b2923',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            {loading ? 'Зберігаю...' : 'Створити'}
          </button>
        </form>
      </div>

      {/* Таблиця користувачів */}
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          Список користувачів
        </h3>
        {loading && users.length === 0 ? (
          <div style={{ fontSize: 14 }}>Завантаження...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
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
                  <th style={{ textAlign: 'left', padding: 8 }}>ПІБ</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Email</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Ролі</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ padding: 8 }}>{u.id}</td>
                    <td style={{ padding: 8 }}>{u.fullName}</td>
                    <td style={{ padding: 8 }}>{u.email}</td>
                    <td style={{ padding: 8 }}>
                      {u.roles.map((r) => r.name).join(', ')}
                    </td>
                    <td style={{ padding: 8 }}>
                      {u.isActive ? 'Активний' : 'Вимкнений'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;
