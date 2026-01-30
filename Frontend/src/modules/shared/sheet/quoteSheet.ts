import type { MaterialDto } from '../../../api/materials';

import { escapeHtml, f2, n, uid } from './utils';

export type CalcMode = 'manual' | 'm2' | 'lm';

export type WorkRow = {
  id: string;
  name: string;
  unit: string;
  qty: string;
  costPrice: string;
  marginPct: string;
  discountPct: string;
  clientPrice: string;
  amount: string;
};

export type MaterialRow = WorkRow & {
  materialId?: number;
  calcMode: CalcMode;
  // optional, may be populated from material directory or template
  consumptionPerM2?: string;
  consumptionPerLm?: string;
  weightKg?: string;
  markupPct?: string; // legacy alias (some templates)
};

export type PercentRow = {
  id: string;
  name: string;
  pct: string;
  amount?: string;
};

export type Stage = {
  id: string;
  name: string;
  areaM2: string;
  lengthLm: string;
  works: WorkRow[];
  materials: MaterialRow[];
  percents: PercentRow[];
};

export const CALC_KEYS = new Set(['qty', 'costPrice', 'marginPct', 'discountPct'] as const);

export const LS_TEMPLATES_KEY = 'buduy.kp.templates.v1';
export const LS_TEMPLATE_KEY_LEGACY = 'buduy.kp.template.v2';

export type QuoteTemplateItem = {
  id: string;
  name: string;
  title: string;
  stages: Stage[];
  updatedAt: string;
};

type RecalcRowShape = {
  qty: string;
  costPrice: string;
  markupPct: string;
  discountPct: string;
  clientPrice: string;
  amount: string;
};

export function recalcRow<T extends RecalcRowShape>(row: T): T {
  const qty = n(row.qty, 0);
  const cost = n(row.costPrice, 0);
  const markup = n(row.markupPct, 0);
  const discount = n(row.discountPct, 0);

  const priceBeforeDiscount = cost * (1 + markup / 100);
  const clientPrice = priceBeforeDiscount * (1 - discount / 100);
  const amount = clientPrice * qty;

  return {
    ...row,
    clientPrice: f2(clientPrice) as any,
    amount: f2(amount) as any,
  };
}

export function makeWorkRow(): WorkRow {
  return recalcRow({
    id: uid('w'),
    name: '',
    unit: '',
    qty: '1',
    costPrice: '0',
    marginPct: '0',
    discountPct: '0',
    // internal aliases
    markupPct: '0',
    clientPrice: '0',
    amount: '0',
  } as any) as WorkRow;
}

export function makeMaterialRow(): MaterialRow {
  return recalcRow({
    id: uid('m'),
    materialId: undefined,
    name: '',
    unit: '',
    qty: '1',
    costPrice: '0',
    marginPct: '0',
    discountPct: '0',
    // internal aliases
    markupPct: '0',
    clientPrice: '0',
    amount: '0',
    calcMode: 'manual',
    consumptionPerM2: '',
    consumptionPerLm: '',
    weightKg: '',
  } as any) as MaterialRow;
}

export function makePercentRow(): PercentRow {
  return {
    id: uid('p'),
    name: '',
    pct: '0',
    amount: '0',
  };
}

export function makeStage(name?: string): Stage {
  return {
    id: uid('st'),
    name: name ?? 'Етап',
    areaM2: '',
    lengthLm: '',
    works: [makeWorkRow()],
    materials: [makeMaterialRow()],
    percents: [],
  };
}

export function defaultTemplate(): { title: string; stages: Stage[] } {
  return {
    title: 'Комерційна пропозиція',
    stages: [makeStage('Етап 1')],
  };
}

export function normalizeTemplate(input: any): { title: string; stages: Stage[] } {
  const base = input && typeof input === 'object' ? input : defaultTemplate();
  const title = typeof base.title === 'string' ? base.title : defaultTemplate().title;
  const rawStages = Array.isArray(base.stages) ? base.stages : [];

  const stages: Stage[] = rawStages
    .map((st: any, idx: number): Stage => {
      const areaM2 = String(st?.areaM2 ?? st?.area ?? '');
      const lengthLm = String(st?.lengthLm ?? st?.length ?? '');

      const rawWorks = Array.isArray(st?.works) ? st.works : Array.isArray(st?.workItems) ? st.workItems : [];
      const rawMaterials = Array.isArray(st?.materials)
        ? st.materials
        : Array.isArray(st?.materialItems)
          ? st.materialItems
          : [];
      const rawPercents = Array.isArray(st?.percents) ? st.percents : Array.isArray(st?.percentItems) ? st.percentItems : [];

      const works: WorkRow[] = rawWorks.map((r: any): WorkRow => {
        const row: any = {
          ...makeWorkRow(),
          id: uid('w'),
          name: String(r?.name ?? r?.title ?? ''),
          unit: String(r?.unit ?? ''),
          qty: String(r?.qty ?? r?.quantity ?? '1'),
          costPrice: String(r?.costPrice ?? r?.cost ?? r?.basePrice ?? r?.price ?? '0'),
          marginPct: String(r?.marginPct ?? r?.markupPct ?? r?.markup ?? '0'),
          discountPct: String(r?.discountPct ?? r?.discount ?? '0'),
          markupPct: String(r?.markupPct ?? r?.marginPct ?? r?.markup ?? '0'),
        };
        return recalcRow(row) as any;
      });

      const materials: MaterialRow[] = rawMaterials.map((r: any): MaterialRow => {
        const row: any = {
          ...makeMaterialRow(),
          id: uid('m'),
          materialId: typeof r?.materialId === 'number' ? r.materialId : undefined,
          name: String(r?.name ?? r?.title ?? ''),
          unit: String(r?.unit ?? ''),
          qty: String(r?.qty ?? r?.quantity ?? '1'),
          calcMode: r?.calcMode === 'm2' || r?.calcMode === 'lm' || r?.calcMode === 'manual' ? r.calcMode : 'manual',
          consumptionPerM2: String(r?.consumptionPerM2 ?? ''),
          consumptionPerLm: String(r?.consumptionPerLm ?? ''),
          weightKg: String(r?.weightKg ?? ''),
          costPrice: String(r?.costPrice ?? r?.cost ?? r?.basePrice ?? r?.price ?? '0'),
          marginPct: String(r?.marginPct ?? r?.markupPct ?? r?.markup ?? '0'),
          discountPct: String(r?.discountPct ?? r?.discount ?? '0'),
          markupPct: String(r?.markupPct ?? r?.marginPct ?? r?.markup ?? '0'),
        };
        return recalcRow(row) as any;
      });

      const percents: PercentRow[] = rawPercents.map((p: any): PercentRow => ({
        id: uid('p'),
        name: String(p?.name ?? p?.title ?? ''),
        pct: String(p?.pct ?? p?.percent ?? '0'),
        amount: String(p?.amount ?? '0'),
      }));

      return {
        id: uid('st'),
        name: String(st?.name ?? st?.title ?? `Етап ${idx + 1}`),
        areaM2,
        lengthLm,
        works,
        materials,
        percents,
      };
    })
    .filter(Boolean);

  if (stages.length === 0) return defaultTemplate();
  return { title, stages };
}

export function loadTemplates(): QuoteTemplateItem[] {
  try {
    // ✅ migration from legacy single-template key
    const legacyRaw = localStorage.getItem(LS_TEMPLATE_KEY_LEGACY);
    const raw = localStorage.getItem(LS_TEMPLATES_KEY);

    if (!raw) {
      if (legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        if (legacy && Array.isArray(legacy.stages)) {
          const migrated: QuoteTemplateItem[] = [
            {
              id: 'tpl_legacy',
              name: 'Базовий шаблон',
              title: String(legacy.title ?? 'Комерційна пропозиція'),
              stages: legacy.stages,
              updatedAt: new Date().toISOString(),
            },
          ];
          localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }

      // first run
      const def = defaultTemplate();
      const initial: QuoteTemplateItem[] = [
        {
          id: 'tpl_default',
          name: 'Базовий шаблон',
          title: def.title,
          stages: def.stages,
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(initial));
      return initial;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && Array.isArray((x as any).stages));
  } catch {
    return [];
  }
}

export function saveTemplates(items: QuoteTemplateItem[]) {
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(items));
}

export function stageTotals(stage: Stage): {
  works: number;
  materials: number;
  base: number;
  perc: number;
  total: number;
} {
  const works = stage.works.reduce((acc, r) => acc + n((r as any).amount), 0);
  const materials = stage.materials.reduce((acc, r) => acc + n((r as any).amount), 0);
  const base = works + materials;
  const perc = stage.percents.reduce((acc, p) => acc + base * (n(p.pct) / 100), 0);
  const total = base + perc;
  return { works, materials, base, perc, total };
}

export function materialQtyByMode(row: MaterialRow, stage: Stage, matsById: Map<number, MaterialDto>): string {
  if (row.calcMode === 'manual' || !row.materialId) return row.qty;
  const mat = matsById.get(row.materialId);
  if (!mat) return row.qty;
  if (row.calcMode === 'm2') {
    const cons = n((mat as any).consumptionPerM2 ?? 0);
    const qty = n(stage.areaM2) * cons;
    return qty ? f2(qty) : '';
  }
  const cons = n((mat as any).consumptionPerLm ?? 0);
  const qty = n(stage.lengthLm) * cons;
  return qty ? f2(qty) : '';
}

export function printKp(title: string, stages: Stage[]) {
  const htmlStages = stages
    .map((s) => {
      const t = stageTotals(s);
      const worksRows = s.works
        .filter((r) => (r.name || '').trim().length > 0)
        .map(
          (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.unit)}</td>
            <td style="text-align:right;">${escapeHtml(r.qty)}</td>
            <td style="text-align:right;">${escapeHtml(r.clientPrice)}</td>
            <td style="text-align:right;">${escapeHtml(r.amount)}</td>
          </tr>`,
        )
        .join('');

      const matRows = s.materials
        .filter((r) => (r.name || '').trim().length > 0)
        .map(
          (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(r.name)}</td>
            <td>${escapeHtml(r.unit)}</td>
            <td style="text-align:right;">${escapeHtml(r.qty)}</td>
            <td style="text-align:right;">${escapeHtml(r.clientPrice)}</td>
            <td style="text-align:right;">${escapeHtml(r.amount)}</td>
          </tr>`,
        )
        .join('');

      const percRows = s.percents
        .filter((p) => (p.name || '').trim().length > 0 || n(p.pct))
        .map((p) => {
          const amount = t.base * (n(p.pct) / 100);
          return `<tr><td colspan="4">${escapeHtml(p.name)} (${escapeHtml(p.pct)}%)</td><td></td><td style="text-align:right;">${f2(
            amount,
          )}</td></tr>`;
        })
        .join('');

      return `
        <section style="margin: 18px 0;">
          <h3 style="margin: 0 0 8px 0;">${escapeHtml(s.name)} — ${f2(t.total)}</h3>
          <div style="font-size:12px; color:#555; margin-bottom:6px;">Площа: ${escapeHtml(
            s.areaM2,
          )} м² • Довжина: ${escapeHtml(s.lengthLm)} м.п.</div>

          <h4 style="margin: 10px 0 6px;">Роботи</h4>
          <table>
            <thead><tr><th>#</th><th>Найменування</th><th>Од.</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr></thead>
            <tbody>${worksRows || '<tr><td colspan="6" style="color:#777;">—</td></tr>'}</tbody>
            <tfoot>
              <tr><td colspan="5" style="text-align:right; font-weight:700;">Підсумок робіт</td><td style="text-align:right; font-weight:700;">${f2(
                t.works,
              )}</td></tr>
            </tfoot>
          </table>

          <h4 style="margin: 14px 0 6px;">Матеріали</h4>
          <table>
            <thead><tr><th>#</th><th>Найменування</th><th>Од.</th><th>К-сть</th><th>Ціна</th><th>Сума</th></tr></thead>
            <tbody>${matRows || '<tr><td colspan="6" style="color:#777;">—</td></tr>'}</tbody>
            <tfoot>
              <tr><td colspan="5" style="text-align:right; font-weight:700;">Підсумок матеріалів</td><td style="text-align:right; font-weight:700;">${f2(
                t.materials,
              )}</td></tr>
            </tfoot>
          </table>

          ${
            percRows
              ? `<h4 style="margin: 14px 0 6px;">% / Додатково</h4>
                 <table>
                  <tbody>${percRows}</tbody>
                 </table>`
              : ''
          }

          <div style="margin-top: 10px; font-size: 13px; font-weight: 700;">Разом етап: ${f2(t.total)}</div>
        </section>`;
    })
    .join('');

  const total = stages.reduce((acc, s) => acc + stageTotals(s).total, 0);

  const doc = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 16px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        th { background: #f6f7f8; text-align: left; }
        h2 { margin: 0 0 10px 0; }
      </style>
    </head>
    <body>
      <h2>${escapeHtml(title)}</h2>
      <div style="font-size:14px; font-weight:700; margin: 0 0 10px;">Разом по КП: ${f2(total)}</div>
      ${htmlStages}
      <script>window.onload = () => { window.print(); };</script>
    </body>
  </html>`;

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.open();
  w.document.write(doc);
  w.document.close();
}
