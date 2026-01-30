import React, { useState } from 'react';
import type { Material } from './types';
import { deactivateMaterial, updateMaterial } from './api';

type Props = {
  materials: Material[];
  onChanged: () => void;
};

export const MaterialsTable: React.FC<Props> = ({ materials, onChanged }) => {
  const [error, setError] = useState<string | null>(null);

  const toggleActive = async (m: Material) => {
    setError(null);
    try {
      // якщо активний — деактивуємо через DELETE (на бекенді isActive=false)
      if (m.isActive) await deactivateMaterial(m.id);
      else await updateMaterial(m.id, { isActive: true });

      onChanged();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Помилка оновлення');
    }
  };

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      {error && <div style={{ marginBottom: 8, color: '#b91c1c' }}>{error}</div>}

      <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>Назва</th>
            <th>Одиниця</th>
            <th>SKU</th>
            <th>Базова ціна</th>
            <th>Статус</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {materials.map(m => (
            <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb', opacity: m.isActive ? 1 : 0.6 }}>
              <td>{m.name}</td>
              <td>{m.unit}</td>
              <td>{m.sku ?? '—'}</td>
              <td>{m.basePrice}</td>
              <td>{m.isActive ? 'Активний' : 'Неактивний'}</td>
              <td style={{ textAlign: 'right' }}>
                <button onClick={() => toggleActive(m)}>
                  {m.isActive ? 'Деактивувати' : 'Активувати'}
                </button>
              </td>
            </tr>
          ))}
          {materials.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>
                Поки немає матеріалів
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
