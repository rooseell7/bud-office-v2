/**
 * Router for /delivery/acts/:id and /estimate/acts/:id — renders read or edit based on ?mode=read
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const ActEditorPage = React.lazy(() =>
  import('./ActEditorPage').then((m) => ({ default: m.ActEditorPage })),
);
const ActReadPage = React.lazy(() =>
  import('./ActReadPage').then((m) => ({ default: m.ActReadPage })),
);

export const ActByIdPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const isReadMode = searchParams.get('mode') === 'read';

  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Завантаження…</div>}>
      {isReadMode ? <ActReadPage /> : <ActEditorPage />}
    </Suspense>
  );
};
