import React from 'react';

const AdminDashboardPage: React.FC = () => {
  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Дашборд адміністратора</h2>
      <p style={{ fontSize: 14, marginBottom: 24 }}>
        Тут з часом з’являться короткі показники: кількість активних об’єктів,
        заборгованості по актах, постачаннях, зарплатах та прибуток компанії.
        Зараз це стартова точка для навігації.
      </p>

      <ul style={{ fontSize: 14, paddingLeft: 18 }}>
        <li>Керування користувачами та ролями</li>
        <li>Призначення відповідальних за об’єкти / проєкти</li>
        <li>Підготовка до обліку постачання, актів і зарплат</li>
      </ul>
    </div>
  );
};

export default AdminDashboardPage;
