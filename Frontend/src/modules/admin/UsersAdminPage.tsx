// src/modules/admin/UsersAdminPage.tsx
import React from 'react';
import api from '../../api/client';
import { User, Role } from './types';

interface CreateUserForm {
  email: string;
  fullName: string;
  password: string;
  rolesCodes: string[];
}

const emptyForm: CreateUserForm = {
  email: '',
  fullName: '',
  password: '',
  rolesCodes: [],
};

const UsersAdminPage: React.FC = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState<CreateUserForm>(emptyForm);

  const load = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        api.get<User[]>('/users'),
        api.get<Role[]>('/roles'),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження користувачів');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleChange =
    (field: keyof CreateUserForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (field === 'rolesCodes') {
        const value = Array.from(
          (e.target as HTMLSelectElement).selectedOptions,
        ).map((o) => o.value);
        setForm((prev) => ({ ...prev, rolesCodes: value }));
      } else {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      await api.post<User>('/users', form);
      setForm(emptyForm);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Не вдалося створити користувача');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-grid">
      <section className="admin-card admin-card--primary">
        <h2>Користувачі</h2>
        <p>Список усіх користувачів системи Будуй CRM з їх ролями.</p>

        {loading && <p style={{ fontSize: 13 }}>Завантаження…</p>}
        {error && (
          <p style={{ fontSize: 13, color: '#f97373', marginTop: 6 }}>{error}</p>
        )}

        <div className="admin-table-wrapper" style={{ marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Email</th>
                <th>ПІБ</th>
                <th>Ролі</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.email}</td>
                  <td>{u.fullName}</td>
                  <td>
                    {u.roles.map((r) => (
                      <span
                        key={r.id}
                        className="app-chip app-chip--accent"
                        style={{ marginRight: 4 }}
                      >
                        {r.name}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span
                      className="app-chip"
                      style={{
                        background: u.isActive ? 'rgba(34,197,94,0.16)' : '#111827',
                        color: u.isActive ? '#4ade80' : '#9ca3af',
                      }}
                    >
                      {u.isActive ? 'Активний' : 'Неактивний'}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', fontSize: 13 }}>
                    Користувачів ще немає.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h3>Новий користувач</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 10 }}>
          Створи нового користувача й одразу задай йому ролі (наприклад admin,
          foreman, estimator).
        </p>

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-form__field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              required
            />
          </label>

          <label className="admin-form__field">
            <span>Повне ім’я</span>
            <input
              type="text"
              value={form.fullName}
              onChange={handleChange('fullName')}
              required
            />
          </label>

          <label className="admin-form__field">
            <span>Пароль</span>
            <input
              type="password"
              value={form.password}
              onChange={handleChange('password')}
              required
            />
          </label>

          <label className="admin-form__field">
            <span>Ролі</span>
            <select
              multiple
              value={form.rolesCodes}
              onChange={handleChange('rolesCodes')}
            >
              {roles.map((r) => (
                <option key={r.id} value={r.code}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
            <small>Ctrl / Cmd + клік — обрати кілька ролей</small>
          </label>

          <button className="admin-btn" type="submit" disabled={loading}>
            Зберегти користувача
          </button>
        </form>
      </section>
    </div>
  );
};

export default UsersAdminPage;
