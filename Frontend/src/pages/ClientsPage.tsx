import React, { useEffect, useMemo, useState } from 'react';
import { createClient, deleteClient, fetchClients, updateClient } from '../clients/api';
import type { Client } from '../clients/types';

type CreateClientForm = {
  name: string;
  phone: string;
  email: string;
  note: string;
};

type EditClientForm = {
  name: string;
  phone: string;
  email: string;
  note: string;
};

export default function ClientsPage() {
  const [items, setItems] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateClientForm>({
    name: '',
    phone: '',
    email: '',
    note: '',
  });

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditClientForm>({
    name: '',
    phone: '',
    email: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canSubmitCreate = useMemo(() => {
    return form.name.trim().length > 0 && form.phone.trim().length > 0 && !creating;
  }, [form.name, form.phone, creating]);

  const canSubmitEdit = useMemo(() => {
    return (
      editingId &&
      editForm.name.trim().length > 0 &&
      editForm.phone.trim().length > 0 &&
      !saving
    );
  }, [editingId, editForm.name, editForm.phone, saving]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClients();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || 'Помилка завантаження клієнтів');
    } finally {
      setLoading(false);
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);

    const name = form.name.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const note = form.note.trim();

    if (!name || !phone) {
      setCreateError('Заповніть ім’я та телефон.');
      return;
    }

    setCreating(true);
    try {
      const created = await createClient({
        name,
        phone,
        ...(email ? { email } : {}),
        ...(note ? { note } : {}),
      });

      // Додаємо на початок (у нас backend віддає DESC, але так UI “живіший”)
      setItems((prev) => [created, ...prev]);

      setForm({ name: '', phone: '', email: '', note: '' });
    } catch (e: any) {
      setCreateError(e?.message || 'Не вдалося створити клієнта');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c: Client) {
    setEditError(null);
    setEditingId(c.id);
    setEditForm({
      name: c.name ?? '',
      phone: c.phone ?? '',
      email: (c.email ?? '') as string,
      note: (c.note ?? '') as string,
    });
  }

  function cancelEdit() {
    setEditError(null);
    setEditingId(null);
    setEditForm({ name: '', phone: '', email: '', note: '' });
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;

    setEditError(null);

    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    const email = editForm.email.trim();
    const note = editForm.note.trim();

    if (!name || !phone) {
      setEditError('Заповніть ім’я та телефон.');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateClient(editingId, {
        name,
        phone,
        email: email ? email : undefined,
        note: note ? note : undefined,
      });

      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      cancelEdit();
    } catch (e: any) {
      setEditError(e?.message || 'Не вдалося зберегти зміни');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeleteError(null);

    const ok = window.confirm('Видалити клієнта? Дію не можна буде скасувати.');
    if (!ok) return;

    setDeletingId(id);
    try {
      await deleteClient(id);
      setItems((prev) => prev.filter((x) => x.id !== id));

      // якщо видаляємо клієнта, який зараз редагується — закриваємо редагування
      if (editingId === id) cancelEdit();
    } catch (e: any) {
      setDeleteError(e?.message || 'Не вдалося видалити клієнта');
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Клієнти</h2>
        <button onClick={load} disabled={loading}>
          Оновити
        </button>
      </div>

      {/* Створення клієнта */}
      <div style={{ marginTop: 12, border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Додати клієнта</div>

        <form onSubmit={onCreate} style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>Ім’я *</label>
            <input
              value={form.name}
              onChange={(ev) => setForm((p) => ({ ...p, name: ev.target.value }))}
              placeholder="Напр.: Назар"
              style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>Телефон *</label>
            <input
              value={form.phone}
              onChange={(ev) => setForm((p) => ({ ...p, phone: ev.target.value }))}
              placeholder="Напр.: +380..."
              style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>Email (опційно)</label>
            <input
              value={form.email}
              onChange={(ev) => setForm((p) => ({ ...p, email: ev.target.value }))}
              placeholder="name@email.com"
              style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 13, opacity: 0.85 }}>Нотатка (опційно)</label>
            <textarea
              value={form.note}
              onChange={(ev) => setForm((p) => ({ ...p, note: ev.target.value }))}
              placeholder="Коротка примітка…"
              style={{
                padding: 10,
                borderRadius: 10,
                border: '1px solid #e5e7eb',
                minHeight: 70,
                resize: 'vertical',
              }}
            />
          </div>

          {createError && <div style={{ color: 'crimson' }}>{createError}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={!canSubmitCreate} style={{ padding: '10px 12px' }}>
              {creating ? 'Створення…' : 'Створити'}
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setForm({ name: '', phone: '', email: '', note: '' });
              }}
              disabled={creating}
              style={{ padding: '10px 12px' }}
            >
              Очистити
            </button>
          </div>
        </form>
      </div>

      {/* Стан списку */}
      {loading && <p>Завантаження…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {deleteError && <p style={{ color: 'crimson' }}>{deleteError}</p>}

      {!loading && !error && (
        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {items.length === 0 ? (
            <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
              Поки немає клієнтів.
            </div>
          ) : (
            items.map((c) => {
              const isEditing = editingId === c.id;
              const isDeleting = deletingId === c.id;

              return (
                <div key={c.id} style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
                  {!isEditing ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{c.name}</div>
                          <div style={{ opacity: 0.9 }}>Тел: {c.phone}</div>
                          {c.email ? <div style={{ opacity: 0.9 }}>Email: {c.email}</div> : null}
                          {c.note ? <div style={{ marginTop: 6, opacity: 0.85 }}>{c.note}</div> : null}
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <button onClick={() => startEdit(c)} style={{ padding: '8px 10px' }}>
                            Редагувати
                          </button>
                          <button
                            onClick={() => onDelete(c.id)}
                            disabled={isDeleting}
                            style={{ padding: '8px 10px' }}
                          >
                            {isDeleting ? 'Видалення…' : 'Видалити'}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontWeight: 700, marginBottom: 10 }}>Редагування</div>

                      <form onSubmit={onSaveEdit} style={{ display: 'grid', gap: 10 }}>
                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: 13, opacity: 0.85 }}>Ім’я *</label>
                          <input
                            value={editForm.name}
                            onChange={(ev) => setEditForm((p) => ({ ...p, name: ev.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
                            autoComplete="off"
                          />
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: 13, opacity: 0.85 }}>Телефон *</label>
                          <input
                            value={editForm.phone}
                            onChange={(ev) => setEditForm((p) => ({ ...p, phone: ev.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
                            autoComplete="off"
                          />
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: 13, opacity: 0.85 }}>Email (опційно)</label>
                          <input
                            value={editForm.email}
                            onChange={(ev) => setEditForm((p) => ({ ...p, email: ev.target.value }))}
                            style={{ padding: 10, borderRadius: 10, border: '1px solid #e5e7eb' }}
                            autoComplete="off"
                          />
                        </div>

                        <div style={{ display: 'grid', gap: 6 }}>
                          <label style={{ fontSize: 13, opacity: 0.85 }}>Нотатка (опційно)</label>
                          <textarea
                            value={editForm.note}
                            onChange={(ev) => setEditForm((p) => ({ ...p, note: ev.target.value }))}
                            style={{
                              padding: 10,
                              borderRadius: 10,
                              border: '1px solid #e5e7eb',
                              minHeight: 70,
                              resize: 'vertical',
                            }}
                          />
                        </div>

                        {editError && <div style={{ color: 'crimson' }}>{editError}</div>}

                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="submit" disabled={!canSubmitEdit} style={{ padding: '10px 12px' }}>
                            {saving ? 'Збереження…' : 'Зберегти'}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            style={{ padding: '10px 12px' }}
                          >
                            Скасувати
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
