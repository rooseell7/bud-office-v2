import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import type { User, Role } from '../auth/types';
import { useAuth } from '../auth/AuthContext';
import { fetchUsers, fetchRoles, createUser, updateUser } from '../../api/client';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type AdminUser = User & { isActive?: boolean };

const AdminUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [editFullName, setEditFullName] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editRoles, setEditRoles] = useState<string[]>([]);

  const [saveMsg, setSaveMsg] = useState<string | null>(null);

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

  const toggleRole = (code: string, setter: (v: string[]) => void, current: string[]) => {
    setter(
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  };

  const openCreate = () => {
    setEmail('');
    setFullName('');
    setPassword('');
    setSelectedRoles([]);
    setError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!email || !password) {
      setError('Заповни email та пароль.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await createUser({
        email,
        password,
        fullName: fullName || undefined,
        rolesCodes: selectedRoles,
      });
      setCreateOpen(false);
      await loadData();
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = ex?.response?.data?.message ?? ex?.message ?? 'Помилка при створенні користувача.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditFullName(u.fullName);
    setEditIsActive(u.isActive !== false);
    setEditRoles((u.roles ?? []).map((r) => (typeof r === 'string' ? r : r.code)));
    setError(null);
  };

  const handleEdit = async () => {
    if (!editUser) return;
    try {
      setLoading(true);
      setError(null);
      await updateUser(editUser.id, {
        fullName: editFullName,
        isActive: editIsActive,
        rolesCodes: editRoles,
      });
      const isSelf = currentUser?.id === editUser.id;
      setEditUser(null);
      await loadData();
      if (isSelf) {
        setSaveMsg('Права оновлено. Рекомендується перезайти для застосування змін.');
      }
    } catch (e: unknown) {
      const ex = e as { response?: { data?: { message?: string } }; message?: string };
      const msg = ex?.response?.data?.message ?? ex?.message ?? 'Помилка при збереженні.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenPassword = () => {
    setPassword(generatePassword());
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Користувачі
        </Typography>
        <Button variant="contained" onClick={openCreate} startIcon={<PersonAddIcon />}>
          Створити користувача
        </Button>
      </Box>

      {saveMsg && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'success.light',
            color: 'success.contrastText',
          }}
        >
          {saveMsg}
        </Box>
      )}

      {error && (
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 1,
            bgcolor: 'error.light',
            color: 'error.contrastText',
          }}
        >
          {error}
        </Box>
      )}

      <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        {loading && users.length === 0 ? (
          <Box sx={{ p: 3 }}>Завантаження...</Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Імʼя</TableCell>
                <TableCell>Ролі</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell align="right">Дії</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{(u.roles ?? []).map((r) => (typeof r === 'string' ? r : r.name)).join(', ') || '—'}</TableCell>
                  <TableCell>{u.isActive !== false ? 'Активний' : 'Вимкнений'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" startIcon={<EditIcon />} onClick={() => openEdit(u)}>
                      Редагувати
                    </Button>
                    <Button size="small" onClick={() => openEdit(u)} sx={{ ml: 0.5 }}>
                      Права
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Створити користувача</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Імʼя"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            fullWidth
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              label="Пароль"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button variant="outlined" onClick={handleGenPassword} sx={{ whiteSpace: 'nowrap' }}>
              Згенерувати
            </Button>
          </Box>
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ролі
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {roles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={selectedRoles.includes(role.code)}
                      onChange={() => toggleRole(role.code, setSelectedRoles, selectedRoles)}
                    />
                  }
                  label={role.name}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Скасувати</Button>
          <Button variant="contained" onClick={handleCreate} disabled={loading}>
            Створити
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Редагувати: {editUser?.email}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Імʼя"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            fullWidth
          />
          <FormControlLabel
            control={
              <Checkbox checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
            }
            label="Активний"
          />
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ролі
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {roles.map((role) => (
                <FormControlLabel
                  key={role.id}
                  control={
                    <Checkbox
                      checked={editRoles.includes(role.code)}
                      onChange={() => toggleRole(role.code, setEditRoles, editRoles)}
                    />
                  }
                  label={role.name}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Скасувати</Button>
          <Button variant="contained" onClick={handleEdit} disabled={loading}>
            Зберегти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;
