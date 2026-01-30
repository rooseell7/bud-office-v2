import React, { useState } from 'react';
import { createMaterial } from './api';
import type { CreateMaterialDto } from './types';

type Props = {
  onCreated: () => void;
};

export const MaterialForm: React.FC<Props> = ({ onCreated }) => {
  const [form, setForm] = useState<CreateMaterialDto>({
    name: '',
    unit: '',
    sku: '',
    basePrice: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (key: keyof CreateMaterialDto) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setForm(prev => ({
      ...prev,
      [key]: key === 'basePrice' ? Number(val) : val,
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const unit = form.unit.trim();

    if (!name) return setError('Вкажи назву матеріалу');
    if (!unit) return setError('Вкажи одиницю виміру');

    setLoading(true);
    try {
      await createMaterial({
        name,
        unit,
        sku: form.sku?.trim() ? form.sku.trim() : undefined,
        basePrice: Number.isFinite(form.basePrice) ? form.basePrice : 0,
      });
      setForm({ name: '', unit: '', sku: '', basePrice: 0 });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Помилка створення матеріалу');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr 1fr 1fr' }}>
        <input placeholder="Назва" value={form.name} onChange={onChange('name')} />
        <input placeholder="Одиниця" value={form.unit} onChange={onChange('unit')} />
        <input placeholder="SKU (опц.)" value={form.sku ?? ''} onChange={onChange('sku')} />
        <input placeholder="Базова ціна" type="number" value={form.basePrice ?? 0} onChange={onChange('basePrice')} />
      </div>

      {error && <div style={{ marginTop: 8, color: '#b91c1c' }}>{error}</div>}

      <div style={{ marginTop: 10 }}>
        <button type="submit" disabled={loading}>
          {loading ? 'Створюю…' : 'Додати матеріал'}
        </button>
      </div>
    </form>
  );
};
