import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import type { ProjectSummaryDto, ProjectHealthDto } from '../../../api/projects';
import { getProjectHealth } from '../../../api/projects';

type ViewKind = 'sales' | 'estimates';

interface ProjectHeaderProps {
  summary: ProjectSummaryDto;
  currentView: ViewKind;
  health?: ProjectHealthDto | null;
  onBadgeClick?: (key: keyof ProjectHealthDto) => void;
}

/** Canonical sales stage labels (UA). Source of truth. */
const SALES_STAGE_LABELS: Record<string, string> = {
  lead_new: 'Новий',
  contact_made: 'Контакт',
  meeting_scheduled: 'Зустріч запланована',
  meeting_done: 'Зустріч проведена',
  kp_preparing: 'КП готується',
  kp_sent: 'КП відправлено',
  kp_negotiation: 'Узгодження',
  deal_signed: 'Угода підписана',
  handoff_to_exec: 'Передано в реалізацію',
  paused: 'Пауза',
  lost: 'Втрачено',
  // legacy
  planned: 'Планується',
  in_progress: 'В роботі',
  done: 'Завершено',
  lead: 'Лід',
};

const EXECUTION_STATUS_LABELS: Record<string, string> = {
  planned: 'Планується',
  active: 'Активний',
  paused: 'Пауза',
  completed: 'Завершено',
  cancelled: 'Скасовано',
};

const HEALTH_BADGES: { key: keyof ProjectHealthDto; label: string }[] = [
  { key: 'missingClient', label: 'Немає клієнта' },
  { key: 'missingForeman', label: 'Немає виконроба' },
  { key: 'missingContract', label: 'Немає договору' },
  { key: 'hasOverdueNextAction', label: 'Прострочена дія' },
  { key: 'hasUnpaidInvoices', label: 'Є неоплачені' },
];

export function ProjectHeader({ summary, currentView, health: healthProp, onBadgeClick }: ProjectHeaderProps) {
  const navigate = useNavigate();
  const projectId = summary.id;
  const [health, setHealth] = useState<ProjectHealthDto | null>(healthProp ?? null);

  useEffect(() => {
    if (healthProp !== undefined) {
      setHealth(healthProp ?? null);
      return;
    }
    getProjectHealth(projectId).then(setHealth).catch(() => setHealth(null));
  }, [projectId, healthProp]);

  const openInSales = () => navigate(`/sales/projects/${projectId}`);
  const openInEstimates = () => navigate(`/estimates/projects/${projectId}`);

  return (
    <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {summary.name}
          </Typography>
          {summary.address && (
            <Typography variant="body2" color="text.secondary">
              {summary.address}
            </Typography>
          )}
          {summary.client && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Клієнт: {summary.client.name}
              {summary.client.phone ? ` · ${summary.client.phone}` : ''}
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
            <Chip
              size="small"
              label={SALES_STAGE_LABELS[summary.salesStage] ?? summary.salesStage}
              color={summary.salesStage === 'deal_signed' ? 'success' : 'default'}
            />
            {summary.executionStatus && (
              <Chip
                size="small"
                label={EXECUTION_STATUS_LABELS[summary.executionStatus] ?? summary.executionStatus}
                variant="outlined"
              />
            )}
            {health &&
              HEALTH_BADGES.filter((b) => health[b.key]).map((b) => (
                <Chip
                  key={b.key}
                  size="small"
                  label={b.label}
                  color={b.key === 'hasOverdueNextAction' || b.key === 'hasUnpaidInvoices' ? 'warning' : 'default'}
                  variant="outlined"
                  onClick={onBadgeClick ? () => onBadgeClick(b.key) : undefined}
                  sx={{ cursor: onBadgeClick ? 'pointer' : undefined }}
                />
              ))}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexShrink={0}>
          {currentView === 'sales' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={openInEstimates}
            >
              Відкрити в Кошторисах
            </Button>
          )}
          {currentView === 'estimates' && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<OpenInNewIcon />}
              onClick={openInSales}
            >
              Відкрити в Продажах
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
