# System dossier

Un solo expediente para todo el análisis del taller. Regla de oro: cada
afirmación cita su evidencia (archivo y función, prueba, tabla o salida de
comando) o se declara como duda en la sección 9. "El service maneja la
lógica" sin nombres no cuenta como inventario.

## 1. How the system starts

El sistema arranca por el punto de entrada del script `dev`/`start` de
`package.json` (líneas 12-13):

- `npm run dev` -> `node --watch src/server.js`
- `npm start` -> `node src/server.js`

`src/server.js:2` importa la aplicación construida (`import app from
'./app.js'`) y desde la línea 6 ejecuta `app.listen(PORT)`; el puerto sale
de `process.env.PORT ?? 3000` (`src/server.js:4`). La aplicación la
construye `src/app.js` en el arranque del módulo: crea el `app` de Express
(`src/app.js:23`), monta los middleware globales en orden (`src/app.js:25-28`),
las rutas públicas de health (`src/app.js:30`), los módulos `/auth`
(`src/app.js:34`) y `/requests` con `authenticate` delante (`src/app.js:38`),
y al final el not-found y el manejador central de errores (`src/app.js:40-41`).
`src/app.js:43` exporta `app` sin abrir puerto: la suite importa `app` y la
prueba con supertest sin levantar servidor (por eso `test/auth.test.js:9` hace
`import app from '../src/app.js'`).

> Observación del baseline (work-log): `npm run doctor` 7/7 PASS, migraciones
> `001-005` todas SKIPPED (el esquema ya existe), seed repetido sin errores y
> suite 67 tests / 62 pass / 5 todo / 0 fail.

## 2. Main components

| Componente | Archivo o recurso | Responsabilidad | Evidencia | Duda |
| --- | --- | --- | --- | --- |
| Punto de entrada | `src/server.js` | Arranca el proceso HTTP y escucha en `PORT` (3000). No conoce rutas. | `src/server.js:2` importa app; `src/server.js:6` `app.listen(PORT)` | Ninguna |
| Construcción de la app | `src/app.js` | Crea la app de Express, monta middlewares en orden y exporta sin `listen`. | `src/app.js:23-43` | Ninguna |
| Router principal | No hay uno central: los módulos se montan directo en app | `/auth` y `/requests` se cuelgan en la raíz con su propio router | `src/app.js:34-38`; `src/modules/auth/auth.routes.js:8`; `src/modules/requests/requests.routes.js:21` | Ninguna |
| Módulos | `src/modules/auth/*`, `src/modules/requests/*`, `src/modules/users/*` | Separan auth (identidad), requests (dominio del soporte) y users (datos de cuenta) | imports de `src/app.js:20-21`; rutas por módulo | ¿Por qué `users` no tiene rutas propias? (sección 9) |
| Middleware global | `src/middleware/cors.js`, `request-id.js`, `request-logger.js`, `express.json()` | CORS, id de petición, log y parseo de body para TODA petición | `src/app.js:25-28` en ese orden | Ninguna |
| Autenticación | `src/middleware/authenticate.js` + `src/modules/auth/token.js` | Establece QUIÉN es el actor: verifica el Bearer JWT con `jwtVerify` y arma `req.auth = { userId, role }` | `authenticate.js:13-44`; `token.js:35-41`; montado en `app.js:38` | Ninguna |
| Autorización (policies) | `src/modules/requests/request.policy.js` | Decide QUÉ puede hacer el actor: funciones puras (sin Express ni SQL): `canListAllRequests`, `canViewRequest`, `canViewHistory`, `canEditContent`, `canClaimRequest`, etc. | `request.policy.js:16-27` (`canViewRequest` y `canViewHistory` comparten la misma regla) | Ver asimetría del trace: `getRequest` parece NO consultarla (sección 9 / BUG-901) |
| Services | `src/modules/requests/requests.service.js`, `src/modules/auth/auth.service.js` | Capa de coordinación: aplica policy, reglas de use-case y unidades de trabajo. Sin SQL ni códigos HTTP | `requests.service.js:86-93` (`getRequest`), `requests.service.js:219-228` (`getHistory`), `auth.service.js:53-115` (`register`/`login`) | Ninguna |
| Stores / acceso a datos | `src/modules/requests/requests.store.js`, `src/modules/users/users.store.js` | Queries parametrizadas y filas (o null). Sin HTTP ni reglas de dominio | `requests.store.js:50-56` (`findById`, `WHERE id = $1`); `users.store.js:14-40` | Ninguna |
| Conexión PostgreSQL | `src/database/pool.js`, `src/database/transaction.js` | Pool único compartido (`DATABASE_URL`) y transacciones (`withTransaction`) | `pool.js:14-16`; `transaction.js:6-21` (BEGIN/COMMIT/ROLLBACK) | Ninguna |
| Manejo de errores | `src/middleware/error-handler.js` + `src/app-error.js` | Traduce error -> respuesta JSON. AppError con categoría -> status (`CATEGORY_STATUS`) | `error-handler.js:18-24`; `error-handler.js:44-48`; `app-error.js:9-14` | Ninguna |
| Logging | `src/logging/logger.js`, `src/middleware/request-logger.js` | Líneas JSON estructuradas (stdout/stderr) y un log por petición terminada con allowlist de campos | `request-logger.js:18-35` (permite solo method/path/status/duration/requestId/userId/errorCode); `logger.js:9-25` | Ninguna |
| Health / readiness | `src/routes/health.routes.js` | `/health` (vivo, no toca DB) y `/ready` (`SELECT 1`, 503 si falla) | `health.routes.js:20-46`; la dependencia de DB es inyectable para el test | Ninguna |
| Pruebas | `test/*.test.js` + `test/helpers/*` | Red de contrato: `node:test` + supertest; policies puras sin base ni servidor | `package.json:14` (`node --test`); `test/request-detail.test.js`; `test/request-policy.test.js:1-4` | Los 5 stubs `todo` son la deuda del BUG-901 |
| Scripts operativos | `scripts/*.js` | doctor (7 checks), migraciones, seed, validadores, generación de secret | `package.json:17-27`; `scripts/check-environment.js`; `scripts/migrate.js`; `scripts/seed.js`; `scripts/validate-class-09.js` | Ninguna |
| Dependencias externas | `package.json:29-37` | express (HTTP), jose (JWT), pg (PostgreSQL), dotenv (env); dev: supertest | `package.json:29-37` | Ninguna |

## 3. Request trace

Recorrido completo de `GET /requests/:id` — en orden, con archivo y
función en cada paso. Evidencia por paso; cuando una afirmación es
predicción u observación se etiqueta.

1. Router: `src/modules/requests/requests.routes.js:28-31`
   (`router.get('/:id', ...)`) — valida el `:id`, parsea con
   `parseIdParam(req.params.id)` y delega en `getRequest(req.auth, id)`.
2. Middlewares que atraviesa: antes de llegar a este router la petición
   pasó, en orden (`src/app.js:25-28` y `:38`): `corsPolicy`
   (`src/middleware/cors.js:8-23`), `requestId` (`request-id.js:14-23`),
   `requestLogger` (`request-logger.js:13-39`), `express.json()`, y
   `authenticate` (`authenticate.js:13-44`), que corre
   solo para la rama `/requests` y es quien entrega `req.auth`.
3. Dónde se valida el parámetro `id`: `src/http/parse-id.js:16-21`
   (`parseIdParam`) — regex `^[1-9][0-9]{0,17}$`; el id debe ser entero
   positivo; si no, lanza `AppError('contract','INVALID_REQUEST_ID')` y el
   error-handler responde `400` (`error-handler.js:46-48`).
4. Dónde nace la identidad autenticada: `src/middleware/authenticate.js:27-44`
   — `verifyToken(token)` (`src/modules/auth/token.js:35-41`, `jwtVerify`
   con algoritmo `HS256`, `issuer`, `audience` y `exp`) y el actor queda en
   `req.auth = { userId: payload.sub, role: payload.role }`.
5. Policy consultada (¿se consulta?): OBSERVACIÓN — `requests.service.js:86-93`,
   `getRequest`, NO llama a ninguna policy: tras `findById` y el `notFound`,
   devuelve `mapRequestRow(row)` directamente. Hay un comentario
   `// TEMP(REQ-442): visibility check disabled...` (línea 90). En cambio su
   hermana `getHistory` (`requests.service.js:219-228`) SÍ llama
   `canViewHistory(actor, request)` y devuelve `404` si la policy niega.
   Esa asimetría es el hallazgo del ticket BUG-901 (el detalle dejó de
   consultar la policy que ya existe).
6. Service: `src/modules/requests/requests.service.js:86-93` (`getRequest(actor, id)`):
   `findById(id)` -> si `!row` lanza `notFound(id)`; hoy no hay verificación
   de visibilidad; respuesta `mapRequestRow(row)`.
7. Store y query: `src/modules/requests/requests.store.js:50-56` (`findById`) —
   `SELECT id, title, ..., created_by, ... FROM requests WHERE id = $1`
   (parametrizado, con el valor del parámetro como único dato del cliente).
8. Transformación fila -> JSON: `src/modules/requests/request.mapper.js:5-17`
   (`mapRequestRow`) — snake_case -> camelCase (`assigned_to` -> `assignedTo`),
   `id` como `Number`, timestamps pasan tal cual.
9. Respuesta y manejo de errores: `requests.routes.js:29`
   (`res.status(200).json(await getRequest(...))`). Los errores controlados
   fluyen al handler central (`error-handler.js:44-48`): id inválido -> 400,
   inexistente -> `AppError('resource','REQUEST_NOT_FOUND')` 404, inesperados
   -> 500 `INTERNAL_ERROR` con el detalle solo en log (fly `requestId`).
10. Pruebas existentes que cubren este recorrido: `test/request-detail.test.js`
    (401 sin token línea 19-22; 404 id inexistente línea 24-33; owner 200 con
    `createdBy` = owner y freeze de claves líneas 35-52; agente 200 líneas
    54-67; y DOS stubs `todo` para el caso del extraño). También `test/requests.test.js`
    y `test/errors.test.js` cubren el manejo de errores y el contrato de
    respuesta. La familia se puede correr con `npm run test:detail`.

## 4. Database inventory

PostgreSQL en Supabase, mismo proyecto desde la clase 06. Esquema versionado
en `database/migrations/*.sql`:

- `001_create_users.sql` — tabla `users`: `id UUID PK default gen_random_uuid()`,
  `email` UNIQUE, `password_hash`, `role` CHECK (`requester`|`agent`, default
  requester), `created_at`. Un usuario nace siempre con rol `requester`
  (nunca viene del body: `users.store.js:30-39` no acepta role).
- `002_create_requests.sql` — tabla `requests`: `id BIGINT GENERATED ALWAYS
  AS IDENTITY PK`, `title`, `description`, `priority` default `medium`,
  `status` default `open`, `created_by UUID NOT NULL`
  FK -> `users(id) ON DELETE RESTRICT`, timestamps.
- `003_create_request_history.sql` — tabla `request_history`: `id BIGINT
  IDENTITY`, `request_id` FK -> `requests(id)`, `type` CHECK (`status_changed`|
  `priority_changed`), pares `from/to_status`, `from/to_priority`, `changed_by`
  FK -> `users(id)`, `created_at`. `from_status IS NULL` marca el evento de
  nacimiento.
- `004_add_constraints_and_indexes.sql` — `ALTER TABLE` que agrega CHECKs de
  `priority` y `status`, CHECKs de valores en history, e índices
  `idx_requests_created_by`, `idx_requests_status` y
  `idx_request_history_request_order (request_id, created_at, id)`.
- `005_add_request_assignment.sql` — FEATURE-801: `ALTER TABLE requests ADD COLUMN
  assigned_to UUID REFERENCES users(id)`, índice `idx_requests_assigned_to`, y
  el CHECK del tipo de evento se REEMPLAZA (drop + add) para admitir el tercer
  tipo `request_claimed`. Evidencia de "evolucionar sin reescribir".

Las migraciones se corren con `npm run db:migrate` (`scripts/migrate.js`); en
esta máquina salieron las 5 como `[SKIPPED]` porque el esquema ya existe desde
la clase 06. El seed (`npm run db:seed`, `scripts/seed.js:12-18` crea los
usuarios demo `ana.requester.seed@example.test`, `luis.requester.seed@example.test`
y `maria.agent.seed@example.test`; `scripts/seed.js:25-39` define 6 solicitudes
con sus historias). Es repetible sin pisar datos ajenos: borra SOLO las
solicitudes de los usuarios seed (`scripts/seed.js:66-72`) y respeta lo demás.

## 5. Authentication and authorization

- Dónde se verifica el JWT: `src/modules/auth/token.js:35-41` —
  `jwtVerify(token, SECRET_KEY, { algorithms:['HS256'], issuer, audience })`.
  Decodificar no es verificar: `jwtVerify` valida firma, algoritmo, `iss`,
  `aud` y `exp`; los claims no verificados son texto editable (por eso "el
  token es la identidad confiable", `tickets/BUG-901.md`).
- Qué contiene `req.auth`: exactamente `{ userId, role }`,
  `src/middleware/authenticate.js:43`; la única fuente de identidad para el
  resto de la petición. Un token alterado, expirado o con issuer/audience
  ajeno responde 401 `INVALID_TOKEN` indistinto (`authenticate.js:27-40`).
- Dónde viven las reglas de permiso: `src/modules/requests/request.policy.js`
  — funciones puras sobre actor y request (sin Express ni SQL): p. ej.
  `canViewRequest(actor, request)` (`request.policy.js:20-23`): agent -> true;
  requester -> `request.createdBy === actor.userId`.
- Ejemplo de regla y su prueba: `canViewRequest` se prueba puro y sin base en
  `test/request-access-policy.test.js` (los 3 casos vienen como stub `todo` del
  BUG-901 y se convierten en la corrección); el contrato HTTP del detalle se
  prueba en `test/request-detail.test.js` y la identidad en `test/auth.test.js`
  (por ejemplo `GET /auth/me` responde la identidad del token).

## 6. Errors, logs and operational checks

- Formato de error: siempre `{ "error": { "code", "message" }, "requestId" }`
  (`src/middleware/error-handler.js:29-32`). La categoría del `AppError`
  decide el status (`error-handler.js:18-24`), p. ej. `resource` -> 404.
- requestId: via `src/middleware/request-id.js:14-23`; viaja en el header
  `X-Request-Id`, en el log y en la respuesta de error; acepta ids externos
  solo en formato limitado (`^[A-Za-z0-9._-]{1,64}$`).
- Logs: `src/middleware/request-logger.js:18-35` registra una línea por
  petición terminada con allowlist (`method, path, status, durationMs,
  requestId, userId, errorCode`). NUNCA registra headers, bodies, tokens ni
  query strings (comentario `request-logger.js:1-11`; lo verifica
  `test/traceability.test.js`: el requestId del log coincide con el header y
  el Authorization/token no aparecen). Errores internos (stack) van SOLO al
  log vía `logger.error` (`error-handler.js:69-74`), nunca a la respuesta.
- `/health` vs `/ready` (`src/routes/health.routes.js:20-46`): `/health` = "el
  proceso está vivo y responde" y NO toca PostgreSQL (`health.routes.js:27-29`);
  `/ready` = "puede hacer trabajo útil ahora" y hace `SELECT 1`
  (`health.routes.js:31-43`); si la DB falla responde `503 not_ready`, sin
  revelar usuarios ni cadenas. La depende es inyectable para su test.

## 7. Minimum-practices audit

Clasificaciones permitidas: COMPLIES · PARTIAL · DOES_NOT_COMPLY ·
NOT_FOUND · NOT_UNDERSTOOD. Cada fila cita evidencia o reconoce duda.

| Área | Pregunta | Clasificación | Evidencia / duda |
| --- | --- | --- | --- |
| Configuración | ¿Los secretos están fuera del código? | COMPLIES | `.env` con `DATABASE_URL`/`JWT_SECRET` vía `dotenv` (`src/database/pool.js:3-11`, `src/modules/auth/token.js:3-10`); `.env.example` sin valores y `.gitignore` excluye `.env`; el validador tiene check 14 que busca secretos en los entregables. |
| Entrada | ¿Se validan datos externos? | COMPLIES | `parseIdParam` (`src/http/parse-id.js:16-21`) rechaza ids no enteros/cero/negativos; `rejectServerControlledFields` (`requests.service.js:47-54` y `auth.service.js:18,56-63`); `assertValidPriority` (`requests.service.js:59-64`); email y password validados (`auth.service.js:36-51`); `request-id` acepta solo ids limitados. |
| SQL | ¿Las consultas están parametrizadas? | COMPLIES | Todas usan placeholders `$1...$n`: `requests.store.js:43-46,50-56`; `users.store.js:15-19`; los identificadores nunca vienen del cliente (`requests.store.js:22-23`). |
| Identidad | ¿El JWT se verifica? | COMPLIES | `token.js:35-41` `jwtVerify` con `algorithms`, `issuer`, `audience`; `authenticate.js:13-44` exige `Bearer` y arma `req.auth`. |
| Permisos | ¿Existe autorización además de autenticación? | PARTIAL | Las policies existen y se consultan en `createRequest`, `patchRequest`, `getHistory`, `claimRequest` (`requests.service.js:96,162,224,245`); PERO `getRequest` (`requests.service.js:86-93`) no consulta ninguna — asimetría BUG-901. |
| Ownership | ¿Se limita el acceso al propietario cuando corresponde? | PARTIAL | El listado se limita en SQL (`requests.store.js:37-40`), history y patch lo limitan (`requests.service.js:224,162`); el DETALLE (`getRequest`) NO — por eso un requester lee solicitudes ajenas por ID (reproducido: 200 indebido). |
| Dominio | ¿Los campos del servidor están protegidos? | COMPLIES | `SERVER_CONTROLLED_FIELDS` rechaza `id, createdBy, createdAt, updatedAt, changedBy, assignedTo` (`requests.service.js:35,47-54`) y `role` en auth (`auth.service.js:18,56-63`); `user.mapper.js` nunca expone `password_hash`. |
| Consistencia | ¿Las escrituras relacionadas usan transacción? | COMPLIES | `withTransaction` envuelve create+historia (`requests.service.js:113-128`), patch+historia (`:157-214`) y claim+historia (`:240-270`); `transaction.js:6-21`. |
| Errores | ¿Existe un formato consistente? | COMPLIES | `error-handler.js` y `app-error.js`: `{ error: { code, message }, requestId }` para todo error controlado; categorías -> status. |
| Logs | ¿Ayudan a investigar sin exponer secretos? | COMPLIES | Allowlist (`request-logger.js:21-29`) + detalle interno al log con requestId (`error-handler.js:69-74`); `traceability.test.js` prueba que el token NO se loguea. |
| Pruebas | ¿Existen casos positivos y negativos? | PARTIAL | Hay 67 tests con positivos y negativos (400/401/404/409/500); pero el caso negativo del EXTRAÑO en el detalle está como `todo` (`test/request-detail.test.js:69-81`) y los 3 casos puros de `canViewRequest` también (`test/request-access-policy.test.js`) — los convierte este taller. |
| Migraciones | ¿El esquema está versionado? | COMPLIES | `database/migrations/001-005`, evoluciona con `ALTER TABLE`, nunca reescribe las aplicadas (`005_add_request_assignment.sql:1-9`). |
| Seed | ¿Puede repetirse de forma controlada? | COMPLIES | `scripts/seed.js:8` repetible por diseño; borra solo datos de los seeds (`:66-72`), nunca trunca, deja datos ajenos intactos. |
| Arquitectura | ¿HTTP, reglas y SQL están separados razonablemente? | PARTIAL | Hay capas limpias (routes -> service -> policy/store; policy pura sin Express — `request.policy.js:1-3`); pero el TEMP en `getRequest` (`requests.service.js:90`) rompió el paso de policy del detalle: el patrón está pero una ruta lo salta. |
| Operación | ¿Health y readiness tienen propósitos distintos? | COMPLIES | `/health` sin DB vs `/ready` con `SELECT 1` (503 si falla) (`health.routes.js:20-46`); check inyectable para prueba. |

## 8. Change impact

Completa ANTES de modificar código. Commit: `class-09-analysis`.

### Observable behavior

- CAMBIA (lo deseado): un requester que pide por ID una solicitud que no es
  suya dejará de recibir `200` con los datos completos y recibirá `404`
  `REQUEST_NOT_FOUND` — exactamente igual que una solicitud inexistente
  (indistinguible, decisión de este sistema, ver `tickets/BUG-901.md:38-45`).
- NO cambia (lo prohibido): owner -> 200 con el schema actual; agent -> 200;
  sin token -> 401; id inválido -> 400; inexistente -> 404.

### Files likely affected

- `src/modules/requests/requests.service.js` — única zona de código: en
  `getRequest` (líneas 86-93) restaurar la consulta a `canViewRequest` —
  el mismo paso que ya hace `getHistory` (líneas 219-228) y `patchRequest`
  (línea 162) — y borrar el comentario `TEMP(REQ-442)`.
- `src/modules/requests/request.policy.js` — NO se toca: la regla
  `canViewRequest` ya existe y ya protege al historial (`requests.service.js:224`).
- Tests a convertir (stubs `todo`):
  - `test/request-access-policy.test.js` (3 casos puros de `canViewRequest`).
  - `test/request-detail.test.js` (2 regresiones HTTP: extraño -> 404 y
    `?userId=` no concede acceso).
- Ninguna migración (el esquema no cambia) y ninguna capa nueva.

### Rule to protect

"Un requester solo puede ver las solicitudes que él creó; los agentes pueden
ver cualquier solicitud." — `canViewRequest`, `request.policy.js:20-23`.

### Data required

El actor con rol y userId: `req.auth` construido por `authenticate.js:43`
(del token verificado, jamás del query/body — regla de `tickets/BUG-901.md:24-25`),
y `request.createdBy` de la fila (`requests.store.js:50-56`).

### Status codes

| Caso | Status/código hoy | Status/código tras el fix |
| --- | --- | --- |
| Sin token | 401 `AUTHENTICATION_REQUIRED` | 401 (sin cambio) |
| id malformado | 400 `INVALID_REQUEST_ID` | 400 (sin cambio) |
| id inexistente (cualquier rol) | 404 `REQUEST_NOT_FOUND` | 404 (sin cambio) |
| owner requester | 200 | 200 (sin cambio) |
| agent | 200 | 200 (sin cambio) |
| requester ajeno (BUG) | 200 con datos ajenos | 404 `REQUEST_NOT_FOUND` indistinguible |
| `?userId=<owner>` de un ajeno | 200 (hoy) | 404 (la identidad nunca viene del query) |

### Tests to add or change

- Convertir los 3 stubs de `test/request-access-policy.test.js`: agent -> true,
  owner -> true, extraño -> false para `canViewRequest`.
- Convertir los 2 stubs de `test/request-detail.test.js`:
  1. extraño -> `404` (igual que inexistente);
  2. `GET /requests/:id?userId=<owner>` con token del extraño -> `404`.
- El ciclo exige VEMOS FALLAR primero (rojo contra el bug, `git stash` para
  verificarlo sin fix) y después verde con el fix.
- Regresión de vecinos ya existen: `test/regression.test.js` (login, colección
  scoped, claim) y la suite completa debe seguir verde.

### Behavior that must remain unchanged

- Login y emisión de token (`test/regression.test.js:20-30`).
- Listado scoped del requester (`test/regression.test.js:32-48`).
- Claim de agente (`test/regression.test.js:50-63`).
- Owner -> 200 y freeze de claves de la respuesta (`test/request-detail.test.js:35-52`).
- Agent -> 200 (`test/request-detail.test.js:54-67`).
- Historial: 404 para ajeno (`requests.service.js:224`), 200 para owner/agent.
- Formato de error y ids de validación (400), reportado en `test/errors.test.js`.

### Risks

- Cambiar más de lo pedido: si se filtra en el store o se añade una capa,
  el agente (que LEGÍTIMAMENTE ve solicitudes ajenas) podría perder acceso —
  por eso el fix debe vivir en el service consultando la policy, no en SQL.
- Devuelve 403 en vez de 404: contradice la decisión del sistema e informa al
  atacante que el id existe (enumeración), como ya advierte el ticket.
- Romper el schema de la respuesta del owner si algo se re-mapea.
- Vecinos: la suite completa (67 tests) es la red que protege contra esto.

### Unknowns

- Origen y dueño real del parche `TEMP(REQ-442)`: quién decidió desactivar la
  verificación y con qué criterio de "soporte comparando reportes duplicados".
- Por qué el historial sí consulta su policy y el detalle no: si fue
  accidental o una decisión de una iteración anterior.
- Precisión de `Number(row.id)` con BIGINTs muy grandes (el contrato limita a
  18 dígitos, fuera de rango seguro de Number exacto) — deuda teórica del mapper.

## 9. Unknowns and questions

- ¿Quién introdujo `TEMP(REQ-442)` y con qué autorización? El comentario de
  `requests.service.js:90` no tiene dueño ni fecha; un parche "temporal" sin
  dueño es un agujero permanente. ¿Existe el ticket REQ-442 en algún tablero?
- ¿Por qué `getHistory` protege (`requests.service.js:224`) pero `getRequest`
  no? ¿Fue intencional o quedó fuera de un refactor? La asimetría es la mitad
  del diagnóstico de BUG-901.
- El scope del listado vive en SQL (`requests.store.js:37-40`) mientras el del
  detalle debe vivir en la policy: ¿hay una regla de diseño documentada sobre
  cuándo el límite va al SQL y cuándo al service/policy?
- ¿Qué habría pasado si un agente con rol válido enviara `role=agent` en el
  body? Se rechaza por `SERVER_CONTROLLED_FIELDS` (`auth.service.js:56-63`) —
  pregunto si siempre fue así o hubo una versión que lo ignoraba en silencio.
- El `SPA` frontend (`FRONTEND_ORIGIN`) no aparece en `.env`: ¿en qué puerto
  corre la entrega 05A y cómo se probó el CORS de preflight contra este API?
- No entiendo del todo por qué `findById` lanza el 404 del ajeno en el
  service y no en el store: el store devuelve la fila y el service decide la
  visibilidad. ¿Hay funciones que hoy devuelvan 404 en el store? (duda para
  confirmar en el oral).
- El seed deja la VPN "claimada" por Maria, pero vía API cualquier agente
  podría claimarla de nuevo si estuviera `open`; la máquina de estados limita
  los saltos, pero no el "quién": ¿es esperado que un agente distinto pueda
  re-cambiar asignación en un futuro feature?
- Validando: la suite completa tarda ~76 s contra la base real
  (`baseline-test.txt`); me pregunto si en CI/banco de pruebas hay una base
  dedicada o si siempre se corre contra Supabase.