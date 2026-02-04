# Fix: Sheet collab — зміни клітинок з ПК1 з’являються на ПК2 без F5 (WS live applyOp)

## Changelog (коротко)

1. **JOIN_DOC тепер викликається після встановлення WS-з’єднання.** Раніше клієнт викликав `joinDoc()` одразу після `connect()`, через що `JOIN_DOC` міг відправлятися до фактичного підключення і не потрапляти в room `sheet:${docId}`. Тепер join виконується в обробнику події `connect` (опція `joinDocOnConnect`).
2. Додано мінімальну телеметрію під прапором DEV або `localStorage.DEBUG_COLLAB=1`: лог connect (url), connected (transport, socketId), disconnect, joinDoc (docId, room), події DOC_STATE та OP_APPLIED (docId, version, opType). Це допомагає перевірити в DevTools, чи підключився WS, чи є join, чи приходять ops.
3. Логіку sheet (engine, persist, applyOp/hydrate) не змінювали; API контракти та візуал без змін.

## Причина (коротко)

**WS підключався, але JOIN_DOC часто виконувався до встановлення з’єднання.** Socket.IO буферизує emit до connect, але гарантований порядок і доставка краще забезпечити, викликавши join тільки після події `connect`. Після фіксу клієнт спочатку чекає `connect`, потім один раз викликає `joinDoc(docId, 'edit')`, потрапляє в room `sheet:${docId}`, і далі отримує OP_APPLIED при applyOp з інших клієнтів. Broadcast на бекенді вже був коректний (`server.to(room).emit`).

## Список змінених файлів

### Frontend

- **`Frontend/src/sheet/collab/collabClient.ts`**
  - Додано опцію `joinDocOnConnect?: { docId: number; mode?: 'edit' | 'readonly' }`.
  - У обробнику `connect` при наявності `joinDocOnConnect` викликається `joinDoc(docId, mode)` (join після connect).
  - Логи під DEV/DEBUG: connect (url), connected (transport, socketId), disconnect, joinDoc (docId, room), події DOC_STATE/OP_APPLIED.

- **`Frontend/src/sheet/hooks/useSheetCollab.ts`**
  - При створенні клієнта передається `joinDocOnConnect: { docId: documentId, mode: 'edit' }`.
  - Прибрано виклик `client.joinDoc(documentId, 'edit')` одразу після `client.connect()`; join тепер лише з обробника connect.

### Backend

- Змін не було. Broadcast у `CollabGateway` уже використовує `this.server.to(room).emit('collab', OP_APPLIED)` для room `sheet:${docId}`.

## Acceptance (як перевірити)

1. Відкрити той самий документ (КП/документ з sheet) на ПК1 і ПК2 (обидва через один хост, напр. http://IP_сервера).
2. На ПК1 змінити клітинку → на ПК2 зміна має з’явитися протягом 1–2 с без F5.
3. На ПК2 змінити іншу клітинку → на ПК1 теж видно без F5.
4. У DevTools (ПК2) → Network: активне socket.io (WS), без 401/403/404.
5. При потребі: `localStorage.setItem('DEBUG_COLLAB','1')`, перезавантажити сторінку — у консолі мають з’являтися логи connect, joinDoc, event OP_APPLIED/DOC_STATE.
6. Після перезавантаження сторінки на ПК2: reconnect → знову join → колаб продовжує працювати.
7. Регрес: редагування, автосейв, undo/redo, WS-режим sheet без змін.

## Примітка

**Акти (delivery/acts)** відкриваються з `documentId={null}` і не використовують sheet collab (лише REST). Live-синхронізація через WS застосовується лише до документів з переданим `documentId` (наприклад кошториси/КП з sheet).
