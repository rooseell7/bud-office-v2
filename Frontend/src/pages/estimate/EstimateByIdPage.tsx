/**
 * Router for /estimate/:id — renders read or edit based on ?mode=read
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const EstimateEditorPage = React.lazy(() =>
  import('./EstimateEditorPage').then((m) => ({ default: m.EstimateEditorPage })),
);
const EstimateReadPage = React.lazy(() =>
  import('./EstimateReadPage').then((m) => ({ default: m.EstimateReadPage })),
);

export const EstimateByIdPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isReadMode = searchParams.get('mode') === 'read';

  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Завантаження…</div>}>
      {isReadMode ? <EstimateReadPage /> : <EstimateEditorPage />}
    </Suspense>
  );
};
