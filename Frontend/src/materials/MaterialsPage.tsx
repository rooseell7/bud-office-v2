import React, { useEffect, useMemo, useState } from 'react';
import { getMaterials, getMaterialCategories, getUnits, importMaterialsExcel } from './api';
import type { Material, MaterialCategory, Unit, SortBy, SortDir } from './types';

export const MaterialsPage: React.FC = () => {
  const [items, setItems] = useState<Material[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [unitId, setUnitId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState<boolean | ''>(true);

  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortDir, setSortDir] = useState<SortDir>('ASC');

  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    return {
      q: q.trim() || undefined,
      page: meta.page,
      limit: meta.limit,
      sortBy,
      sortDir,
      categoryId: categoryId === '' ? undefined : categoryId,
      unitId: unitId === '' ? undefined : unitId,
      isActive: isActive === '' ? undefined : isActive,
    };
  }, [q, meta.page, meta.limit, sortBy, sortDir, categoryId, unitId, isActive]);

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const [list, cats, uns] = await Promise.all([
        getMaterials(query),
        categories.length ? Promise.resolve(categories) : getMaterialCategories(),
        units.length ? Promise.resolve(units) : getUnits(),
      ]);

      setItems(list.items);
      setMeta(list.meta);
      if (!categories.length) setCategories(cats);
      if (!units.length) setUnits(uns);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Не вдалося завантажити матеріали');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.q, query.page, query.limit, query.sortBy, query.sortDir, query.categoryId, query.unitId, query.isActive]);

  const onImport = async (file: File) => {
    setError(null);
    try {
      await importMaterialsExcel(file);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Помилка імпорту');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginTop: 0 }}>Матеріали</h1>

      {/* Controls */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: 8 }}>
          <input
            placeholder="Пошук (назва / SKU)"
            value={q}
            onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setQ(e.target.value); }}
          />

          <select value={categoryId} onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setCategoryId(e.target.value ? Number(e.target.value) : ''); }}>
            <option value="">Всі категорії</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select value={unitId} onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setUnitId(e.target.value ? Number(e.target.value) : ''); }}>
            <option value="">Всі одиниці</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
          </select>

          <select value={isActive === '' ? '' : String(isActive)} onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setIsActive(e.target.value === '' ? '' : e.target.value === 'true'); }}>
            <option value="true">Активні</option>
            <option value="">Всі</option>
            <option value="false">Неактивні</option>
          </select>

          <select value={sortBy} onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setSortBy(e.target.value as any); }}>
            <option value="name">Сортування: Назва</option>
            <option value="basePrice">Сортування: Ціна</option>
            <option value="createdAt">Сортування: Створено</option>
            <option value="updatedAt">Сортування: Оновлено</option>
            <option value="isActive">Сортування: Статус</option>
          </select>

          <select value={sortDir} onChange={(e) => { setMeta(m => ({ ...m, page: 1 })); setSortDir(e.target.value as any); }}>
            <option value="ASC">ASC</option>
            <option value="DESC">DESC</option>
          </select>
        </div>

        <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ display: 'inline-block' }}>
            <input
              type="file"
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.currentTarget.value = '';
              }}
            />
            <span style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }}>
              Імпорт з Excel
            </span>
          </label>

          <div style={{ opacity: 0.7 }}>
            Формат Excel: колонки <b>name</b>, <b>unit</b>, <b>sku</b>, <b>basePrice</b>, <b>categoryId</b>, <b>unitId</b>, <b>isActive</b>
          </div>
        </div>
      </div>

      {error && <div style={{ marginBottom: 8, color: '#b91c1c' }}>{error}</div>}
      {loading ? <div>Завантаження…</div> : <MaterialsTable items={items} />}

      {/* Pagination */}
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button disabled={meta.page <= 1} onClick={() => setMeta(m => ({ ...m, page: m.page - 1 }))}>Назад</button>
        <div>Сторінка {meta.page} / {meta.pages} (всього {meta.total})</div>
        <button disabled={meta.page >= meta.pages} onClick={() => setMeta(m => ({ ...m, page: m.page + 1 }))}>Далі</button>

        <select value={meta.limit} onChange={(e) => setMeta(m => ({ ...m, page: 1, limit: Number(e.target.value) }))} style={{ marginLeft: 12 }}>
          {[10, 20, 50, 100].map(x => <option key={x} value={x}>{x} / стор.</option>)}
        </select>
      </div>
    </div>
  );
};

const MaterialsTable: React.FC<{ items: Material[] }> = ({ items }) => {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <table width="100%" cellPadding={8} style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th>Назва</th>
            <th>Категорія</th>
            <th>Одиниця</th>
            <th>SKU</th>
            <th>Ціна</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          {items.map(m => (
            <tr key={m.id} style={{ borderTop: '1px solid #e5e7eb', opacity: m.isActive ? 1 : 0.6 }}>
              <td>{m.name}</td>
              <td>{m.category?.name ?? '—'}</td>
              <td>{m.unitRef?.code ?? m.unit ?? '—'}</td>
              <td>{m.sku ?? '—'}</td>
              <td>{m.basePrice}</td>
              <td>{m.isActive ? 'Активний' : 'Неактивний'}</td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 12, opacity: 0.7 }}>Нічого не знайдено</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
