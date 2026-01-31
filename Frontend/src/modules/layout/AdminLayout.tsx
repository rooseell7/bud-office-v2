import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Верхній бар */}
      <header
        style={{
          height: 56,
          backgroundColor: '#0b2923',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to="/home"
            aria-label="BUD Office — на головну"
            style={{
              fontWeight: 800,
              fontSize: 20,
              letterSpacing: 0.5,
              color: '#fff',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            BUD Office
          </Link>
          <span
            style={{
              fontSize: 13,
              opacity: 0.8,
              padding: '2px 8px',
              borderRadius: 999,
              backgroundColor: '#cdd629',
              color: '#0b2923',
              fontWeight: 600,
            }}
          >
            Admin
          </span>
        </div>

        <button
          onClick={handleLogout}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Вийти
        </button>
      </header>

      {/* Контентна частина */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 56px)' }}>
             {/* Ліва навігація */}
      <nav
        style={{
          width: 220,
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e5e7eb',
          padding: '16px 12px',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
          Адмін-панель
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: 6 }}>
            <Link to="/admin" style={{ fontSize: 14 }}>
              Дашборд
            </Link>
          </li>
          <li style={{ marginBottom: 6 }}>
            <Link to="/admin/users" style={{ fontSize: 14 }}>
              Користувачі та ролі
            </Link>
          </li>
          <li style={{ marginBottom: 6 }}>
            <Link to="/admin/roles" style={{ fontSize: 14 }}>
              Довідник ролей
            </Link>
          </li>
          <li style={{ marginBottom: 6, opacity: 0.5 }}>
            <span style={{ fontSize: 14 }}>
              Об’єкти / проєкти (далі)
            </span>
          </li>
          <li style={{ marginBottom: 6, opacity: 0.5 }}>
            <span style={{ fontSize: 14 }}>
              Постачання / зарплати / фінанси (далі)
            </span>
          </li>
        </ul>
      </nav>


        {/* Основний контент адмінки */}
        <main style={{ flex: 1, padding: 24 }}>
          {/* Поки що простий плейсхолдер, далі сюди підв’яжемо сторінки */}
          <h1 style={{ marginTop: 0, marginBottom: 16, fontSize: 22 }}>
            Адмін-панель BUD Office
          </h1>
          <p style={{ maxWidth: 600, fontSize: 14 }}>
            Тут буде управління користувачами, ролями, об’єктами, ставками,
            зарплатами та інтеграція з бухгалтерією. Поки що це базовий каркас
            layout’у.
          </p>

          {/* Місце для вкладених роутів /admin/... (на майбутнє) */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
