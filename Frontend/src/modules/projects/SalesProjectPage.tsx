import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getSalesProjectDetails,
  setNextAction,
  completeAction,
  updateSalesProject,
  type SalesProjectDetails,
} from '../../api/sales';
import { ProjectHeader } from './components/ProjectHeader';
import ProjectTimelineTab from './components/ProjectTimelineTab';
import {
  getProjectSummary,
  getProjectDetails,
  getProjectAttachments,
  uploadProjectAttachment,
  deleteProjectAttachment,
  type ProjectSummaryDto,
  type ProjectDetailsDto,
  type ProjectAttachmentDto,
} from '../../api/projects';
import {
  getSalesContacts,
  addSalesContact,
  type SalesContactDto,
} from '../../api/sales';

const SALES_STAGE_OPTIONS = [
  { value: 'lead_new', label: 'Новий' },
  { value: 'contact_made', label: 'Контакт' },
  { value: 'meeting_scheduled', label: 'Зустріч запланована' },
  { value: 'meeting_done', label: 'Зустріч проведена' },
  { value: 'kp_preparing', label: 'КП готується' },
  { value: 'kp_sent', label: 'КП відправлено' },
  { value: 'kp_negotiation', label: 'Узгодження' },
  { value: 'deal_signed', label: 'Угода підписана' },
  { value: 'handoff_to_exec', label: 'Передано в реалізацію' },
  { value: 'paused', label: 'Пауза' },
  { value: 'lost', label: 'Втрачено' },
];

const NEXT_ACTION_TYPES = [
  { value: 'call', label: 'Дзвінок' },
  { value: 'meeting', label: 'Зустріч' },
  { value: 'send_kp', label: 'Відправити КП' },
  { value: 'follow_up', label: 'Дозвон' },
  { value: 'other', label: 'Інше' },
];

function a11yProps(index: number) {
  return { id: `sales-tab-${index}`, 'aria-controls': `sales-tabpanel-${index}` };
}

export default function SalesProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projectId = id ? Number(id) : NaN;
  const [summary, setSummary] = useState<ProjectSummaryDto | null>(null);
  const [details, setDetails] = useState<SalesProjectDetails | null>(null);
  const [projectDetails, setProjectDetails] = useState<ProjectDetailsDto | null>(null);
  const [attachments, setAttachments] = useState<ProjectAttachmentDto[]>([]);
  const [contacts, setContacts] = useState<SalesContactDto[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextActionType, setNextActionType] = useState('other');
  const [nextActionDue, setNextActionDue] = useState('');
  const [nextActionNote, setNextActionNote] = useState('');
  const [completeComment, setCompleteComment] = useState('');
  const [savingAction, setSavingAction] = useState(false);
  const [completingAction, setCompletingAction] = useState(false);
  const [savingStage, setSavingStage] = useState(false);
  const [contactType, setContactType] = useState('call');
  const [contactResult, setContactResult] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [uploadTag, setUploadTag] = useState('other');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!Number.isFinite(projectId) || projectId <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const [s, d, pd, att, cont] = await Promise.all([
        getProjectSummary(projectId),
        getSalesProjectDetails(projectId),
        getProjectDetails(projectId).catch(() => null),
        getProjectAttachments(projectId).catch(() => []),
        getSalesContacts(projectId).catch(() => []),
      ]);
      setSummary(s);
      setDetails(d);
      setProjectDetails(pd ?? null);
      setAttachments(Array.isArray(att) ? att : []);
      setContacts(Array.isArray(cont) ? cont : []);
      setNextActionType(d.nextAction?.type ?? 'other');
      setNextActionDue(d.nextAction?.dueAt ?? '');
      setNextActionNote(d.nextAction?.note ?? '');
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка завантаження');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const handleStageChange = async (newStage: string) => {
    setSavingStage(true);
    try {
      await updateSalesProject(projectId, { salesStage: newStage });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка збереження');
    } finally {
      setSavingStage(false);
    }
  };

  const handleSaveNextAction = async () => {
    const due = nextActionDue.trim().slice(0, 10);
    if (!due) return;
    setSavingAction(true);
    try {
      await setNextAction(projectId, { type: nextActionType, dueAt: due, note: nextActionNote.trim() || undefined });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка збереження');
    } finally {
      setSavingAction(false);
    }
  };

  const handleCompleteAction = async () => {
    setCompletingAction(true);
    try {
      await completeAction(projectId, completeComment.trim() || undefined);
      setCompleteComment('');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка');
    } finally {
      setCompletingAction(false);
    }
  };

  const handleAddContact = async () => {
    setAddingContact(true);
    try {
      await addSalesContact(projectId, { type: contactType, result: contactResult.trim() || undefined });
      setContactResult('');
      const list = await getSalesContacts(projectId);
      setContacts(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Помилка');
    } finally {
      setAddingContact(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadProjectAttachment(projectId, file, uploadTag);
      const list = await getProjectAttachments(projectId);
      setAttachments(list);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Помилка завантаження');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteProjectAttachment(projectId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Помилка');
    }
  };

  const accessInfo = projectDetails?.accessInfo as Record<string, string> | undefined;
  const ACCESS_KEYS = ['entryRules', 'intercomCode', 'keysLocation', 'parkingNote', 'contactPerson', 'contactPhone', 'accessHours'] as const;
  const ACCESS_LABELS: Record<string, string> = {
    entryRules: 'Правила доступу',
    intercomCode: 'Код домофона',
    keysLocation: 'Де ключі',
    parkingNote: 'Паркування',
    contactPerson: 'Контактна особа',
    contactPhone: 'Телефон',
    accessHours: 'Години доступу',
  };

  if (loading && !summary) {
    return (
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error || !summary) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="error">{error || 'Проєкт не знайдено'}</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)} sx={{ mt: 1 }}>
          Назад
        </Button>
      </Box>
    );
  }

  const d = details!;

  return (
    <Box sx={{ p: 2 }}>
      <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/sales/projects')} sx={{ mb: 1 }}>
        Назад
      </Button>
      <ProjectHeader summary={summary} currentView="sales" />

      <Card sx={{ mt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, pt: 1 }}>
          <Tab label="Огляд" {...a11yProps(0)} />
          <Tab label="Клієнт" {...a11yProps(1)} />
          <Tab label="Угода" {...a11yProps(2)} />
          <Tab label="Дії" {...a11yProps(3)} />
          <Tab label="Комунікації" {...a11yProps(4)} />
          <Tab label="Файли" {...a11yProps(5)} />
          <Tab label="Документи" {...a11yProps(6)} />
          <Tab label="Таймлайн" {...a11yProps(7)} />
        </Tabs>
        <Divider />
        <CardContent>
          {tab === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Стадія продажу</Typography>
                <FormControl size="small" sx={{ minWidth: 220, mt: 0.5 }}>
                  <Select
                    value={d.salesStage ?? 'lead_new'}
                    onChange={(e) => handleStageChange(e.target.value)}
                    disabled={savingStage}
                  >
                    {SALES_STAGE_OPTIONS.map((o) => (
                      <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Наступна дія</Typography>
                <Typography>{d.nextAction ? `${d.nextAction.type} до ${d.nextAction.dueAt}` : '—'}</Typography>
                {d.nextAction?.note && <Typography variant="caption" display="block">{d.nextAction.note}</Typography>}
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Угода</Typography>
                <Typography>{d.deal ? `${d.deal.title} — ${d.deal.amount} (${d.deal.status})` : '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">Клієнт</Typography>
                <Typography>{d.client?.name ?? '—'}</Typography>
                {d.client?.phone && <Typography variant="body2">{d.client.phone}</Typography>}
              </Box>
              {accessInfo && Object.keys(accessInfo).length > 0 && (
                <Box sx={{ mt: 1, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Доступ на об'єкт
                  </Typography>
                  {ACCESS_KEYS.filter((k) => accessInfo[k]).map((k) => (
                    <Typography key={k} variant="body2" sx={{ mb: 0.25 }}>
                      <strong>{ACCESS_LABELS[k] ?? k}:</strong> {String(accessInfo[k])}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
          {tab === 1 && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Клієнт</Typography>
              <Typography fontWeight={600}>{d.client?.name ?? '—'}</Typography>
              <Typography variant="body2">Телефон: {d.client?.phone ?? '—'}</Typography>
            </Box>
          )}
          {tab === 2 && (
            <Box>
              {d.deal ? (
                <>
                  <Typography variant="subtitle2" color="text.secondary">Угода</Typography>
                  <Typography fontWeight={600}>{d.deal.title}</Typography>
                  <Typography>Сума: {d.deal.amount}</Typography>
                  <Typography>Статус: {d.deal.status}</Typography>
                  <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => navigate('/sales/deals')} sx={{ mt: 1 }}>
                    Відкрити угоди
                  </Button>
                </>
              ) : (
                <Typography color="text.secondary">Угоду по об'єкту не додано.</Typography>
              )}
            </Box>
          )}
          {tab === 3 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 400 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Тип дії</InputLabel>
                <Select
                  label="Тип дії"
                  value={nextActionType}
                  onChange={(e) => setNextActionType(e.target.value)}
                >
                  {NEXT_ACTION_TYPES.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Термін (YYYY-MM-DD)"
                fullWidth
                value={nextActionDue}
                onChange={(e) => setNextActionDue(e.target.value)}
              />
              <TextField
                size="small"
                label="Примітка"
                fullWidth
                multiline
                value={nextActionNote}
                onChange={(e) => setNextActionNote(e.target.value)}
              />
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="contained" size="small" onClick={handleSaveNextAction} disabled={savingAction || !nextActionDue.trim()}>
                  Зберегти наступну дію
                </Button>
                {d.nextAction && (
                  <>
                    <TextField
                      size="small"
                      placeholder="Коментар (опційно)"
                      value={completeComment}
                      onChange={(e) => setCompleteComment(e.target.value)}
                      sx={{ minWidth: 180 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<CheckCircleIcon />}
                      onClick={handleCompleteAction}
                      disabled={completingAction}
                    >
                      Завершити дію
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          )}
          {tab === 4 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Тип</InputLabel>
                  <Select
                    label="Тип"
                    value={contactType}
                    onChange={(e) => setContactType(e.target.value)}
                  >
                    <MenuItem value="call">Дзвінок</MenuItem>
                    <MenuItem value="meeting">Зустріч</MenuItem>
                    <MenuItem value="message">Повідомлення</MenuItem>
                    <MenuItem value="other">Інше</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="Результат / примітка"
                  value={contactResult}
                  onChange={(e) => setContactResult(e.target.value)}
                  sx={{ minWidth: 200 }}
                />
                <Button variant="contained" size="small" onClick={handleAddContact} disabled={addingContact}>
                  Додати
                </Button>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Історія контактів</Typography>
                {contacts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Немає записів.</Typography>
                ) : (
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {contacts.map((c) => (
                      <li key={c.id}>
                        <Typography variant="body2">
                          {c.type} — {new Date(c.at).toLocaleString('uk-UA')}
                          {c.result && `: ${c.result}`}
                        </Typography>
                      </li>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}
          {tab === 5 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Тег</InputLabel>
                  <Select
                    label="Тег"
                    value={uploadTag}
                    onChange={(e) => setUploadTag(e.target.value)}
                  >
                    <MenuItem value="photo_before">Фото до</MenuItem>
                    <MenuItem value="photo_progress">Фото в процесі</MenuItem>
                    <MenuItem value="photo_after">Фото після</MenuItem>
                    <MenuItem value="contract">Договір</MenuItem>
                    <MenuItem value="plan">План</MenuItem>
                    <MenuItem value="other">Інше</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" size="small" component="label" disabled={uploading}>
                  {uploading ? 'Завантаження…' : 'Завантажити файл'}
                  <input type="file" hidden onChange={handleUpload} />
                </Button>
              </Box>
              {attachments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Немає файлів.</Typography>
              ) : (
                <Box component="ul" sx={{ m: 0, pl: 2 }}>
                  {attachments.map((a) => (
                    <li key={a.id}>
                      <Typography variant="body2" component="span">
                        {a.originalName}
                        {a.tag && (
                          <Chip size="small" label={a.tag} sx={{ ml: 0.5 }} />
                        )}
                      </Typography>
                      <Button size="small" color="error" onClick={() => handleDeleteAttachment(a.id)} sx={{ ml: 0.5 }}>
                        Видалити
                      </Button>
                    </li>
                  ))}
                </Box>
              )}
            </Box>
          )}
          {tab === 6 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Кошториси та документи по об'єкту
              </Typography>
              <Button size="small" startIcon={<OpenInNewIcon />} onClick={() => navigate(`/estimates/projects/${projectId}`)}>
                Відкрити в Кошторисах
              </Button>
            </Box>
          )}
          {tab === 7 && <ProjectTimelineTab projectId={projectId} />}
        </CardContent>
      </Card>
    </Box>
  );
}
