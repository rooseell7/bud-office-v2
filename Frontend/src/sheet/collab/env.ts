/**
 * Collab env. Re-exports from canonical resolver.
 * WS never connects to localhost:5173.
 */

export {
  apiBaseUrl,
  wsBaseUrl,
  isProdLike,
  origin,
} from '../../shared/config/env';

/** Alias for wsBaseUrl (backward compat) */
export { wsBaseUrl as COLLAB_URL } from '../../shared/config/env';
