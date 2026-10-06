# Class 07 incident report

Cada sección se completó mientras investigaba. Los hechos van en
*Evidence*; las interpretaciones van en *Hypotheses*.

## Baseline

Antes de tocar una línea de código:

```bash
npm run class-07:doctor     # 7/7 PASS -> "Environment ready for incident response."
npm run db:migrate          # las 4 migraciones [SKIPPED]: el esquema ya venía de la clase 06
npm run db:seed             # 2 requesters, 1 agent, 6 requests, 15 history events
npm test                    # 20 pass, 0 fail, 17 todo
npm run incidents:reproduce # los 3 incidentes REPRODUCED
```

Con el doctor en verde, un fallo posterior es mío y no del ambiente.

**Un ajuste de entorno, no de código:** el script `test` de `package.json`
usaba `'test/*.test.js'` entre comillas simples. En Windows el intérprete de
comandos no las elimina, así que Node recibía el `'` como parte del patrón,
no encontraba ningún archivo y reportaba `tests 0` — un falso verde. Se quitaron
las comillas; en Linux/macOS el shell las expande igual.

## Incident 701

### Report

> "Some request identifiers return an internal server error."

Un integrador construye enlaces hacia solicitudes y algunos devuelven 500:
"a veces funciona y a veces no".

### Reproduction

```http
GET /requests/not-a-number        (como ana, rol requester)
```

### Expected result

`400` con `{ "error": { "code": "INVALID_REQUEST_ID", ... } }`.

### Actual result

```
[INC-701] Actual: 500 INTERNAL_ERROR        [REPRODUCED]
```

Cuerpo recibido:

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "An unexpected error occurred." } }
```

No había `requestId`: ese es OPS-703.

### Hypotheses

1. **El `Number()` del id produce `NaN` y el SQL se ejecuta antes de validar.**
   Cómo comprobarlo: ejecutar a mano la misma consulta que hace el store con
   los valores que produce `Number()`.
2. **`parseInt` es el culpable y acepta prefijos numéricos** (`12abc` → 12),
   lo que además devolvería un `404` engañoso. Cómo comprobarlo: preguntar
   qué devuelve `parseInt('12abc')` y si eso es lo que envió el cliente.
3. **La columna `id` no acepta lo que llega** (tipo o rango). Cómo
   comprobarlo: `\d requests` y el tipo real de la columna.

### Evidence

Siguiendo el valor desde Express hasta SQL: `requests.routes.js` hacía
`Number(req.params.id)` y lo pasaba directo a `findById` → `WHERE id = $1`.
Ejecutando esa consulta con los valores que produce `Number()`:

```
findById(Number("not-a-number")) -> 22P02 | invalid input syntax for type bigint: "NaN"
findById(Number("12abc"))        -> 22P02 | invalid input syntax for type bigint: "NaN"
findById(Number("1.5"))          -> 22P02 | invalid input syntax for type bigint: "1.5"
findById(Number("0"))            -> OK (0 rows)
findById(Number("-3"))           -> OK (0 rows)
```

Esto descarta la hipótesis 3 (el tipo es `bigint` y acepta enteros) y
confirma la 1: el valor inválido viaja hasta PostgreSQL y **la base de datos
es la que se niega**. La 2 queda confirmada por el mismo dato —
`Number('12abc')` también es `NaN`, o sea que `parseInt` habría convertido un
id malformado en un `12` silenciosamente.

Ojo con `0` y `-3`: **no** son un 500, son un `404` silencioso. El reporte de
soporte decía "a veces funciona y a veces no" — esta asimetría explica la
confusión del integrador.

### Confirmed cause

`req.params.id` se convertía con `Number()` sin validarse. El valor se
convertía en `NaN`, `pg` lo serializaba como la cadena `"NaN"`, PostgreSQL
respondía `22P02`, ese error no era un `AppError` y `respondError` lo
traducía a `500 INTERNAL_ERROR`. El 500 no era del id: era de la consulta que
el id malformado provokeó.

### Correction

`src/modules/requests/requests.routes.js` — un único `requestIdFrom(raw)` que
lanza `AppError('contract','INVALID_REQUEST_ID')` antes de cualquier SQL, con
un patrón anclado `/^[1-9][0-9]{0,18}$/`:

* anclado, no `parseInt`: `12abc` completo se rechaza;
* `0` y negativos se rechazan: la secuencia empieza en 1, nunca identifican un
  recurso;
* 19 dígitos como máximo: la columna es `bigint` y `Number()` perdería
  precisión por encima de `Number.MAX_SAFE_INTEGER`.

Se usa en las tres rutas que leen el id (`/:id`, `/:id/history`, `PATCH /:id`).

### Regression test

`test/errors.test.js`:

* `an alphabetic id answers 400 INVALID_REQUEST_ID, not 500` — falla sin el
  arreglo (500) y pasa con él (400 + código).
* `decimal, zero and negative ids are rejected the same way` — cubre
  `1.5`, `0`, `-3`, `12abc`, `1e3` y `12` con espacio.
* `a well-formed id that matches nothing still answers 404` — **protege el
  contrato que el arreglo no debe romper**: `999999999` sigue siendo `404
  REQUEST_NOT_FOUND`.

## Incident 702

### Report

> "Updating some priorities produces an internal server error."

Un agente marcó una solicitud como `critical` desde una herramienta externa y
recibió 500.

### Reproduction

```http
PATCH /requests/12   {"priority": "critical"}   (como maria, rol agent)
```

### Expected result

`400` con `INVALID_PRIORITY`.

### Actual result

```
[INC-702] Actual: 500 INTERNAL_ERROR        [REPRODUCED]
```

### Hypotheses

1. **La aplicación no valida `priority` antes del `UPDATE`.** Cómo
   comprobarlo: leer `patchRequest` y ver si existe una comprobación de la
   lista `['low','medium','high']`.
2. **Falta el `DEFAULT` o el tipo de la columna** y el insert falla. Cómo
   comprobarlo: `\d requests`.
3. **La migración 004 no se aplicó** y no existe la restricción. Cómo
   comprobarlo: `npm run db:migrate` (respondió `[SKIPPED]`, o sea que ya
   estaba) y listar las restricciones.

### Evidence

En `requests.service.js`, `patchRequest` validaba `title` y `status` pero
**no `priority`**: el valor llegaba directo a `updateRequest`. La consulta
reproducida a mano:

```
updateRequest priority="critical" -> 23514 | new row for relation "requests"
                                       violates check constraint "requests_priority_check"
```

La restricción sí existía, y la 2 queda también descartada:

```
requests_priority_check: CHECK (priority IN ('low','medium','high'))
```

Confirma la 1. El 500 venía de la **segunda** defensa (la base de datos)
actuando porque la **primera** (la aplicación) no estaba.

### Confirmed cause

`requests.service.js` no validaba `priority` ni en `patchRequest` ni en
`createRequest`. PostgreSQL rechazaba el valor con `23514`, ese error no era un
`AppError` y terminaba en `500 INTERNAL_ERROR`.

### Correction

`src/modules/requests/requests.service.js` — `assertValidPriority(priority)`
lanza `AppError('contract','INVALID_PRIORITY')`, llamada en **ambos** caminos
(`patchRequest` y `createRequest`, para que `POST` no sea la puerta de atrás)
y **antes** de `withTransaction`, es decir antes de cualquier SQL.

El mensaje (`Priority must be low, medium or high.`) se construye con
`humanList(PRIORITIES)` sobre el mismo array que valida, para que el texto
público no pueda separarse de la regla.

**La segunda defensa no se tocó.** La restricción `requests_priority_check`
sigue en la base: protege la integridad si este código falla o si otro
proceso escribe en la tabla. Eliminar la restricción habría hecho desaparecer
el 500 sin corregir el contrato. Una prueba nueva lo verifica:

* `the PostgreSQL CHECK constraint is still there as a second defense` —
  consulta `pg_constraint` y falla si alguien la borró.

### Regression test

`test/errors.test.js`:

* `an invalid priority answers 400 INVALID_PRIORITY before touching SQL`
* `creation validates priority with the same rule as PATCH`
* `a valid priority change still works after the fix` — `low` → `high` sigue
  dando 200. Un arreglo que rompe el caso válido no es un arreglo.

## Error flow

**Dónde se crea el error.** En el módulo, con `AppError(category, code,
message)`: `requests.service.js` y `auth.service.js` lanzan errores tipados y
no conocen códigos HTTP. Un error **inesperado** (el `22P02` de PostgreSQL, un
`throw` de una librería) nunca se crea a mano: Simply llega.

**Cómo llega al middleware.** `src/app.js` registra `errorHandler` al final.
Express 5 propaga solo tanto un `throw` como una promesa rechazada, así que
las rutas ya no llevan `try/catch`: se borraron los cinco de
`requests.routes.js`, los tres de `auth.routes.js` y el de `authenticate.js`.
`src/http/respond-error.js` quedó sin uso y se eliminó — el esqueleto decía
que este middleware lo reemplazaba. Esa repetición era el problema: ocho
copias de la misma tabla de traducción, y las tres rutas de `/auth` y las
cinco de `/requests` podían divergir.

**Qué recibe el cliente.** `{ "error": { "code", "message" }, "requestId" }`,
siempre. Para un `AppError`, `code` y `message` son los que el módulo definió
(el mensaje público del contrato). Para lo demás, un código genérico:
`400 INVALID_JSON`, `503 DATABASE_UNAVAILABLE`, `500 INTERNAL_ERROR`.

**Qué queda solo en el log.** El `errorName`, el `errorMessage` y el `stack`
de lo inesperado, vía `logger.error('unhandled_error', …)` con el mismo
`requestId`. La respuesta nunca lleva `error.message`, `stack`, SQL, nombres
de tabla ni rutas.

Dos decisiones que conviene nombrarlas:

* `res.headersSent` → `return next(error)`. Si la respuesta ya empezó, su
  línea de estado y sus headers están escritos: no hay forma de meter el
  contrato. Se delega en Express, que destruye la conexión para que el cliente
  no lea un cuerpo truncado como un éxito.
* `DATABASE_UNAVAILABLE` (503) está separado de `INTERNAL_ERROR` (500). Si la
  base está caída, el proceso está vivo: reiniciarlo no arregla nada y
  multiplica el daño. Un 503 es "no me mandes tráfico"; un 500 es "yo fallé".

## Request ID

`src/middleware/request-id.js` se registra **primero** en `app.js`, antes de
CORS, del parser JSON y de las rutas: el id tiene que existir antes de que
algo pueda fallar, para que un preflight o un body malformado sean tan
rastreables como una petición normal.

Un `X-Request-Id` del cliente se acepta solo si cumple `/^[A-Za-z0-9._-]{1,64}$/`;
cualquier otra cosa se reemplaza por `req_<uuid>`. Un header es entrada no
confiable: repetir texto arbitrario en cada línea de log es como se falsifican
líneas. La prueba `a suspicious client X-Request-Id is replaced, never trusted`
manda 300 caracteres y también `abc"} forged`.

El identificador identifica la **petición**, no al usuario, y no es secreto.
El JWT nunca serviría como id: es una credencial y cambia por usuario, no por
petición.

**Cómo lo comprobé** (no lo supuse): la misma id aparece en el header
`X-Request-Id`, dentro del body del error y en la línea de log.

```json
{"timestamp":"2026-10-06T00:53:40.584Z","level":"info","event":"request_completed",
 "requestId":"req_8916e85f-e8cf-4554-8035-a0e0f335dba7","method":"GET",
 "path":"/requests/999999999","status":404,"durationMs":103.74,
 "userId":"c386e993-…","errorCode":"REQUEST_NOT_FOUND"}
```

La prueba `the log line of a request carries the same requestId as the response`
hace exactamente eso: captura la consola durante la petición, parsea cada
línea como JSON y busca la que lleva el `requestId` del header.

El log es una **allowlist** (`requestId`, `method`, `path`, `status`,
`durationMs`, más `userId` y `errorCode` cuando existen), no el objeto request.
Registrar `req.headers` es exactamente lo que pone un `Authorization` en el
log, y un token en un log es una credencial viva. Elegir campo por campo
convierte "el log no puede filtrar" en una propiedad de este código en vez de
una promesa. `the Authorization header and the token never reach the log`
intercepta la consola en dos peticiones autenticadas y falla si alguna línea
contiene el token, `Bearer ` o `authorization`.

## AI assistance

**Qué me ayudó a entender.** La diferencia entre síntoma y causa. El síntoma
de INC-701 e INC-702 era el mismo (`500 INTERNAL_ERROR`) y las causas eran
distintas: un parámetro sin validar contra una validación que vivía en la base
de datos. También la asimetría que escondía el reporte de soporte: `NaN`
daba 500 pero `0` daba 404, y por eso el integrador veía "a veces funciona".

**Qué hipótesis propuso y cómo la verifiqué.** Propuso que `Number()` sobre
un id inválido producing `NaN` y que eso llegaba a PostgreSQL. No la acepté
por plausibilidad: ejecuté la consulta del store con cada valor que produce
`Number()` y leí el código SQLSTATE real (`22P02`). El propio dato refutó la
variante de `parseInt` que también estaba sobre la mesa.

**Qué fue incompleto.** La primera propuesta de diagnóstico era "envuelve la
consulta en un try/catch y devuelve 400". Habría hecho pasar la prueba de
INC-701 y roto el contrato: `999999999` habría passado a responder 400 en
lugar de 404, y el validador lo comprueba en el check 01. La corrección
correcta no es capturar el error del SQL, es no ejecutar ese SQL.

La segunda: `console.log` del error completo dentro del handler central.
Habría pasado los checks de formato y filtrado (`stack` y `node_modules` no
aparecen en el body, van en la línea de log) pero viola la regla de no
registrar datos sensibles. Se resolvió con allowlist explícita.

## Remaining doubt

* **Los headers de error.** `errorCode` y `durationMs` viajan en el body y en
  el log, pero no en un header del tipo `X-Error-Code`. Un cliente que solo
  lee headers (por ejemplo un interceptor de fetch) tiene que parsear el body.
  No lo implementé porque el contrato de la clase no lo pide y cambiar el
  contrato "porque sí" es justo lo que el taller prohíbe.
* **La carrera entre `finish` y `close`.** El logger escribe en `finish`, no
  en `close`. Para una respuesta normal no hay diferencia, pero en un cliente
  que aborta la conexión el `finish` puede no dispararse y esa petición no
  deja línea. Escribir en `close` lo resolvería, pero `close` también salta
  al abortar, así que haría falta decidir qué cuenta como petición atendida.
  No encontré una respuesta limpia y lo dejé como está.
* **`22P02` y `23514` no tienen traducción propia.** Ahora los dos son
  `INTERNAL_ERROR` genérico, que es correcto desde fuera pero no tanto para
  operar: si mañana aparece un `23503` (foreign key) el log dice
  `unhandled_error` sin ninguna pista de que fue una restricción. La
  comprobación de la restricción vive en la base y en las pruebas, no en un
  mapa de códigos SQL.
* **Los dos `500` que solo aparecen en producción.** Corregí los dos que
  podía reproducir con evidencia. El validador fabrica un `500` inyectando
  un fallo en `pool.query`, que es una causa que yo elijo. No vi ninguno de
  los dos tickets: no puedo afirmar que sean las únicas dos formas en que este
  backend puede devolver 500.
