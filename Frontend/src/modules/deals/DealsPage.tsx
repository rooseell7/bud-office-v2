import React, { useEffect, useState } from 'react';
import api from '../../api/client';

interface Deal {
  id: number;
  title: string;
  amount?: string;
  stage: string;
  status: string;
  client?: { id: number; name: string };
  project?: { id: number; name: string };
}

const DealsPage: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<Deal[]>('/deals');
      setDeals(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Помилка завантаження угод');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeals();
  }, []);

  return (
    <div>
      <h1>Угоди</h1>

      {error && <div className="error">{error}</div>}

      {isLoading ? (
        <p>Завантаження...</p>
      ) : (
        <table className="list-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Назва</th>
              <th>Сума</th>
              <th>Етап</th>
              <th>Статус</th>
              <th>Клієнт</th>
              <th>Обʼєкт</th>
            </tr>
          </thead>
          <tbody>
            {deals.map(d => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.title}</td>
                <td>{d.amount}</td>
                <td>{d.stage}</td>
                <td>{d.status}</td>
                <td>{d.client?.name}</td>
                <td>{d.project?.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DealsPage;
