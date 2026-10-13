# Work log

Registro del trabajo con IA durante el TALLER (la evaluación tiene su
propio historial obligatorio en assessment/). No copies conversaciones
completas aquí: registra el criterio, no el chat.

Sesión: 2026-10-13 · repo `Clase1-profe-carlos` (remote origin ->
`olivereduardoitsu-droid/Clase1-profe-carlos.git`), starter en
`activities/class-09-starter`.

## What I observed before asking AI

- `npm run doctor` -> 7/7 PASS (`[01/07] Environment configured` ... `[07/07]
  Assessment kit available`). SALIDA ESPERADA: el entorno listo.
- `npm run db:migrate` -> 5 migraciones `[SKIPPED]`, "No pending migrations".
  PREDICCIÓN antes de correr: el esquema ya existe desde la clase 06, así que
  esperaba SKIPPED. OBSERVADO: correcto, todas SKIPPED.
- `npm run db:seed` -> "2 requesters ready · 1 agent ready · 6 requests ready ·
  15 history events ready · 1 request already assigned". Esperado y observado.
- `npm test` -> 67 tests totales: 62 pass, 0 fail, 5 `todo` (los stubs del
  BUG-901), duración ~76 s. PREDICCIÓN: verde con todos los `todo` porque la
  suite documenta el bug como deuda pendiente. OBSERVADO: la `todo` es
  justamente el hueco.
- LEÍ el código antes de preguntar nada: `src/app.js`, `src/server.js`,
  `src/modules/requests/requests.service.js`, `request.policy.js`,
  `requests.store.js`, `requests.routes.js`, `src/http/parse-id.js`,
  `src/middleware/authenticate.js`, `src/middleware/error-handler.js`,
  `src/middleware/request-logger.js`, `test/request-detail.test.js`,
  `test/request-access-policy.test.js`, `test/regression.test.js`,
  `tickets/BUG-901.md` y el template del dossier.
- Reproduje el bug por mí mismo contra el server vivo (puerto 3001) con los
  dos requesters del seed ANTES de pedir interpretación: ver sección siguiente.

## What I asked

Solo después de reproducir con mis propias manos:

1. "¿Por qué `GET /requests/:id` responde 200 a un requester ajeno cuando
   `GET /requests/:id/history` responde 404 al mismo ajeno?" — para confirmar
   la asimetría que yo había observado.
2. "¿Cuál es el cambio MÍNIMO que pide BUG-901 y cuáles son los anti-fixes que
   el ticket no acepta?" (404 vs 403, filtro en store, capa nueva).
3. "¿Qué stubs `todo` del repo debo convertir y cuál es el ciclo rojo/verde
   que exige la clase?"

## What the AI proposed

- Confirmó la asimetría: `getRequest` (`requests.service.js:86-93`) no llama
  a la policy mientras `getHistory` (`:219-228`) y `patchRequest` (`:162`) sí;
  `canViewRequest` ya existe en `request.policy.js:20-23` — la regla no está
  rota, está IGNORADA en una de sus llamadas.
- Propuso restaurar el paso de policy en `getRequest` (devuelve `404`
  indistinguible vía `notFound(id)`, el mismo camino que `getHistory`) y
  borrar el `TEMP(REQ-442)`. Sin cambios en store, rutas, migraciones ni capas.
- Propuso convertir los 3 stubs de `test/request-access-policy.test.js` y los
  2 de `test/request-detail.test.js`, verlos ROJO contra el bug (`git stash`
  del fix) y luego verde.
- La lista de anti-fixes que descartamos (viene del ticket y de la lámina 10):
  fix en la ruta, filtro en el store, devolver 403, añadir una capa nueva
  (controllers/DTOs).

## Evidence I checked

- `src/modules/requests/requests.service.js:86-93` vs `:219-228` — leído
  comparando las dos funciones hermanas; la diferencia está en la línea del
  `TEMP(REQ-442)` (línea 90).
- `src/modules/requests/request.policy.js:20-23` — `canViewRequest` devuelve
  `true` para agent y `request.createdBy === actor.userId` para requester.
- `test/request-detail.test.js:69-81` y `test/request-access-policy.test.js:19-31` —
  los 5 stubs `todo` con los contratos esperados escritos en comentarios.
- Reproducción real (evidencia de primera mano): ana (owner) -> 200;
  luis (ajeno) -> 200 (BUG); luis/history -> 404 `REQUEST_NOT_FOUND`;
  luis a id inexistente -> 404; maria (agent) -> 200. Dos requesters reales,
  token real, ID real (137, "Mi laptop no enciende").
- `validate-class-09.js` leído entero para conocer exactamente los 14 checks
  (entiendo qué verifica cada uno y qué texto exige el dossier).
- El código del `request-logger.js` y `traceability.test.js` para la sección
  de logs (allowlist, el token jamás se loguea).

## What I accepted

- El fix mínimo es en el SERVICE, no en otra capa: `getRequest` debe llamar a
  `canViewRequest(actor, request)` como hace su hermana y devolver `notFound(id)`
  cuando la policy niega (404 indistinguible, decisión del ticket).
- La identidad para la policy SIEMPRE desde `req.auth` (token verificado),
  nunca de `userId`/`createdBy` del query o body.
- Convertir primero las pruebas puras de policy (sin Express ni base) y luego
  las dos regresiones HTTP; prueba antes que fix para poder ver el rojo.
- Eliminar el comentario `TEMP(REQ-442)` del todo con el fix (un parche sin
  dueño no debe sobrevivir).

## What I rejected

- Rechacé un fix en la RUTA (`requests.routes.js`) o en el STORE: el agente
  legitimamente ve solicitudes ajenas; filtrar por `created_by` en SQL rompería
  al agente, y duplicar la query iniciaría una deriva. La policy ya existe y
  decide por rol — solo hay que consultarla.
- Rechacé responder `403 FORBIDDEN` para el ajeno: contradice el contrato
  explícito del ticket (`BUG-901.md:28-29` y decisión `:38-45`) y le confirma
  al atacante que el id existe (enumeración). El historial ya usa 404
  indistinguible: es el patrón a copiar.
- Rechacé crear capas nuevas (controllers/repositories/DTOs) y migraciones:
  el ticket lo prohíbe (`BUG-901.md:30-32`) y un fix mínimo no las justifica.
- Rechacé aceptar un diff multi-archivo de la IA sin poder explicar cada parte:
  el diff completo cabe en pocas líneas y las pruebo, no las copio.

## What I changed

ESTADO EN EL COMMIT `class-09-analysis` (todavía NO hay cambio de código):
- `activities/class-09/system-dossier.md` — completé secciones 1-9 con
  evidencia (archivos, funciones, salidas de esta sesión y de la reproducción).
- `activities/class-09/work-log.md` — este registro (baseline, reproducción,
  decisiones).

CAMBIOS PENDIENTES (se commitean como `class-09-fix`):
- `src/modules/requests/requests.service.js` — restaurar `canViewRequest` en
  `getRequest` + quitar `TEMP(REQ-442)`.
- `test/request-access-policy.test.js` — convertir los 3 stubs.
- `test/request-detail.test.js` — convertir los 2 stubs.

## How I verified it

(Ciclo exacto en el commit `class-09-fix`; aquí el estado hasta el análisis.)
- Baseline: `npm run doctor` (7/7 PASS) · `npm run db:migrate` (5 SKIPPED) ·
  `npm run db:seed` (repetible) · `npm test` (67 tests: 62 pass, 0 fail, 5 todo).
- Reproducción: salidas reales con server en `http://127.0.0.1:3001`
  (owner 200 / ajeno 200 BUG / history ajeno 404 / inexistente 404 / agent 200).
- Reporto las DOS salidas del contraste en el dossier sección 8 y 3.

## What I still cannot explain

- Quién introdujo realmente `TEMP(REQ-442)` y por qué: el comentario no tiene
  dueño y contradice la decisión documentada del sistema. (Va a la sección 9
  del dossier, que nunca debe quedar vacía.)
- Por qué el historial se protege y el detalle no — me parece un accidente de
  un refactor anterior, pero no tengo evidencia de la intención.
- Si en CI el validador corre igual en entorno Linux/bash; en Windows el check
  de la suite usa `shell: '/bin/bash'` y hay que confirmar el entorno exacto
  del evaluador.