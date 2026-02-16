# STEP 4: Presence + Who's Where + Soft Locks + Room Security

## Summary

- **Backend**: In-memory presence store (context: module, projectId, entity, route, mode), TTL 90s, cleanup every 15s. Socket events: `bo:presence:hello`, `bo:presence:state`, `bo:presence:leave`, `bo:presence:heartbeat`. Rooms: `presence:global`, `presence:project:{id}`, `presence:entity:{type}:{id}`. Soft edit state: `bo:edit:begin`, `bo:edit:end`, `bo:edit:state`. Room-level security: join only if user has access to project/entity.
- **Frontend**: Presence client (send hello on route change, heartbeat 25s), `usePresence()` hook, header “Online: N” with dropdown (first 10 users, name/role/module). Build presence context from pathname (`buildPresenceContext`).

## Files changed/added

### Backend

| File | Change |
|------|--------|
| `Backend/src/presence/presence-store.service.ts` | **NEW** – In-memory presence store (by socketId), TTL 90s, cleanup 15s, getGlobal/getByProject/getByEntity. |
| `Backend/src/presence/editing-store.service.ts` | **NEW** – Soft lock store (entityType:entityId → editors), TTL 90s, begin/end/heartbeat/getState. |
| `Backend/src/presence/presence.module.ts` | Added PresenceStoreService, EditingStoreService; exported. |
| `Backend/src/collab/collab.module.ts` | TypeOrmModule.forFeature([Act, Invoice, SupplyOrder, User]). |
| `Backend/src/collab/collab.gateway.ts` | Injected PresenceStoreService, EditingStoreService, Act/Invoice/SupplyOrder/User repos. Extended `validateRoomAccess`: `presence:global`, `presence:project:X`, `presence:entity:type:id` (resolve entity → projectId, check project access). Added `getProjectIdForEntity(act/invoice/order)`. Handlers: `bo:presence:hello`, `bo:presence:leave`, `bo:presence:heartbeat`; throttle 1s per scope; `broadcastPresenceStateThrottled`. Handlers: `bo:edit:begin`, `bo:edit:end`; broadcast `bo:edit:state` to `presence:entity:type:id`. On disconnect: remove from presence store, broadcast state to affected rooms. |

### Frontend

| File | Change |
|------|--------|
| `Frontend/src/shared/realtime/presenceClient.ts` | **NEW** – `getModuleFromPath`, `buildPresenceContext(pathname, searchParams, mode)` for route → context. |
| `Frontend/src/shared/realtime/usePresence.ts` | **NEW** – `reducePresenceState`, `emptyPresenceState`, `usePresence()` (globalUsers, projectUsers, entityUsers, editors, sendPresenceHello, sendEditBegin/End). |
| `Frontend/src/realtime/realtimeClient.ts` | Options: `onPresenceState`, `onEditState`. Events: `bo:presence:state`, `bo:edit:state`. Methods: `sendPresenceHello`, `sendPresenceLeave`, `sendEditBegin`, `sendEditEnd`. On connect: join `presence:global`. Heartbeat 25s: `bo:presence:heartbeat`. On disconnect: `bo:presence:leave`. |
| `Frontend/src/realtime/RealtimeContext.tsx` | State: `presenceState`, `editState`. Client options: `onPresenceState`, `onEditState`. Context value: presenceState, editState, sendPresenceHello, sendPresenceLeave, sendEditBegin, sendEditEnd. |
| `Frontend/src/modules/layout/MainLayout.tsx` | usePresence(); on route/connect send `sendPresenceHello(buildPresenceContext(...))`; on unmount sendPresenceLeave. Header: green dot + “N” button; Popover “Онлайн зараз: N” + list of first 10 (name, role, module). |

## Room security

- `presence:global`: any authenticated user.
- `presence:project:{id}`: only if `projects.userId === currentUser` (project owner).
- `presence:entity:{type}:{id}`: resolve act/invoice/order to projectId; then same as project.

Outbox/bo:invalidate unchanged; realtime data (STEP 2/3) unchanged.

## Demo (2 tabs)

1. Open two browser sessions (or two tabs with different users).
2. In the header, green dot + number: “Онлайн зараз: 2”.
3. Click the number → dropdown with both users (name, role, module).
4. In one tab go to an act (e.g. `/estimate/acts/12`); in the other open the same act → both see presence in that entity room (if UI for “Viewing: …” is added on the entity page).
5. In one tab switch to “edit” and call `sendEditBegin('act', '12')` (e.g. from act editor on focus) → other tab can show “Editing: UserName” (when entity page uses `usePresence().editors('act', '12')`).

## Build

- Backend: `npm run build` ✅  
- Frontend: `npm run build` ✅  

## Optional (not done in this step)

- Project presence UI: “Online on this project: N” + avatars on project pages.
- Entity presence/editing banner on act/invoice/order detail pages.
- Read models / projections (STEP 4 Part E).
