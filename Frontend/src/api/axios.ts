// src/api/axios.ts
// Legacy shim: деякі старі модулі імпортують axios інстанс із цього шляху.
// Канонічний клієнт — src/api/client.ts (axios.create + Bearer token interceptor).

import api from './client';

export default api;
