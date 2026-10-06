# course-progress-evidence-01-07

Paquete de evidencia para el diagnóstico acumulativo 7 en 1.
Generado automáticamente — completa las secciones marcadas con [COMPLETAR] antes de ejecutar el prompt.

## Metadata

* studentId: [COMPLETAR — tu identificador de estudiante, sin datos personales extra]
* promptVersion: ITSU-CHECKPOINT-01-07-1.0
* rubricVersion: BACKEND-01-07-R1
* generatedAt: 2026-10-06T14:35:50.301Z (EXECUTED_NOW)
* repoRoot: Clase1-profe-carlos-1
* commit: cf39418 (EXECUTED_NOW)
* repositorioRemoto: https://github.com/olivereduardoitsu-droid/Clase1-profe-carlos.git (EXECUTED_NOW) — verifica que sea TU repositorio antes de continuar
* modeloUtilizado: [COMPLETAR después de ejecutar el prompt]

### Contexto de git (informativo, EXECUTED_NOW)

El curso se trabaja en computadoras compartidas: el historial local puede
estar incompleto o pertenecer a otra sesión sin que falte trabajo real.
Este contexto NO es evidencia requerida — la evidencia son los archivos
del repositorio remoto del estudiante y sus respuestas. La ausencia de
commits aquí no debe interpretarse como evidencia faltante.

```text
cf39418 clase 7 hecha
834dbce clase7
1a4e646 clase 6
89fdaa9 taller primera semana
aeab626 se completo la base de datos con supabase
f231818 clase 2
1296c7e clase 2
ade1e4d version mejorada del servidor
```

## Evidencia por clase

Los archivos listados existen en el repositorio (FOUND). Un archivo de salida guardado, como validation-evidence.txt, es TEXTO: demuestra que se guardó, no que se ejecutó (NOT_VERIFIED como ejecución).

### Clase 01 — Fundamentos de backend

* NOT_FOUND: ningún artefacto esperado de esta clase

### Clase 02 — HTTP y contratos

* FOUND: activities\class-02\.gitignore
* FOUND: activities\class-02\README.md
* FOUND: activities\class-02\ai-usage.md
* FOUND: activities\class-02\casos-de-prueba.md
* FOUND: activities\class-02\comparison.md
* FOUND: activities\class-02\lite-analysis.md
* FOUND: activities\class-02\lite-api\package.json
* FOUND: activities\class-02\lite-api\server.js
* FOUND: activities\class-02\project\README.md
* FOUND: activities\class-02\project\docs\http-contract.md
* FOUND: activities\class-02\project\package.json
* FOUND: activities\class-02\project\src\app.js
* … 5 archivo(s) más con el mismo patrón

Extracto de activities\class-02\project\docs\http-contract.md (redactado automáticamente):

```text
# Contrato HTTP — Request API Full

> **Plantilla para completar.** Escribe este documento **antes** de implementar los
> manejadores. El contrato es la promesa que hace tu API; el código es la manera de cumplirla.
> Si primero escribes el código y después el contrato, estarás documentando lo que salió, no
> lo que decidiste.

## Recurso

Describe en dos o tres líneas qué representa una **solicitud** (`request`) en este sistema.

_(Completar)_

### Forma del recurso

| Campo         | Tipo   | Obligatorio | Quién lo asigna | Notas |
| ------------- | ------ | ----------- | --------------- | ----- |
| `id`          |        |             |                 |       |
| `title`       |        |             |                 |       |
| `description` |        |             |                 |       |
| `status`      |        |             |                 |       |
| `priority`    |        |             |                 |       |

---

## Endpoint 1 — Listar solicitudes

| Elemento              | Valor |
| --------------------- | ----- |
| Método                |       |
[... 83 líneas más]
```

Extracto de activities\class-02\README.md (redactado automáticamente):

```text
# Clase 02 — HTTP como contrato

Entrega de la clase 2: **Request API Lite** (análisis y corrección de una API ajena) y
**Request API Full** (construcción de una API propia, especificación primero). Ambas
administran *solicitudes de mantenimiento* y guardan los datos en memoria.

## Organización de la carpeta

```txt
activities/class-02/
├── README.md               ← este archivo
├── .gitignore
├── lite-api/               ← API Lite (original + correcciones)
│   ├── package.json
│   └── server.js
├── lite-analysis.md        ← análisis independiente de la API Lite original
├── casos-de-prueba.md      ← verificación manual: Partes A (original), B (corregida) y C (Full)
├── comparison.md           ← comparación Lite vs Full: 8 dimensiones + 14 preguntas
├── ai-usage.md             ← registro del uso de IA
└── project/                ← Request API Full
    ├── README.md
    ├── package.json
    ├── docs/
    │   └── http-contract.md
    └── src/
        ├── app.js          ← configuración de la aplicación (monta el router)
        ├── server.js       ← arranque del proceso (puerto 3000)
        ├── data/
        │   └── requests.js ← datos en memoria + generateId()
        └── routes/
[... 76 líneas más]
```

### Clase 03 — Recursos, estado y reglas

* NOT_FOUND: ningún artefacto esperado de esta clase

### Clase 04 — PostgreSQL y persistencia

* FOUND: activities\clase6\class-06-starter\scripts\seed.js
* FOUND: activities\class-08-starter\scripts\seed.js
* FOUND: clase-7\class-07-starter\scripts\seed.js
* FOUND: clase6\scripts\seed.js

### Clase 05 — Autenticación y autorización

* FOUND: clase 5\request-api-v5-starter\activities\class-05\README.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\access-matrix.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\ai-usage.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\auth-contract.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\decision-log.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\reflection.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\threat-cases.md
* FOUND: clase 5\request-api-v5-starter\activities\class-05\validation-evidence.md — salida guardada, NOT_VERIFIED como ejecución
* FOUND: clase 5\request-api-v5-starter\scripts\validate-class-05.js

Extracto de clase 5\request-api-v5-starter\activities\class-05\auth-contract.md (redactado automáticamente):

```text
# Contrato de autenticación — Request API v5

Documenta ANTES de implementar. Para cada endpoint: método, ruta, ¿público o
protegido?, body permitido, respuesta de éxito (código + forma) y CADA error
(código HTTP + `error.code`).

## POST /auth/register

## POST /auth/login

## GET /auth/me

## Semántica de errores

¿Cuándo responde tu API `401`? ¿Cuándo `403`? ¿Cuándo `404` aunque el recurso
exista? ¿Cuándo `409`? Escribe el criterio, no solo ejemplos.

```

Extracto de clase 5\request-api-v5-starter\activities\class-05\validation-evidence.md (redactado automáticamente):

```text
# Evidencia de validación — Clase 05

Pega aquí la salida del validador al cerrar cada estación (SIN secretos: el
validador ya evita imprimirlos, no agregues capturas de tu `.env`).

## stage setup

## stage access-design

## stage register

## stage password

## stage login

## stage authentication

## stage ownership

## stage authorization

## Boss battle (integral)

```

### Clase 06 — Onboarding y pruebas

* FOUND: activities\clase6\class-06-starter\.gitignore
* FOUND: activities\clase6\class-06-starter\README.md
* FOUND: activities\clase6\class-06-starter\activities\class-06\README.md
* FOUND: activities\clase6\class-06-starter\activities\class-06\validation-evidence.txt — salida guardada, NOT_VERIFIED como ejecución
* FOUND: activities\clase6\class-06-starter\activities\class-06\work-log.md
* FOUND: activities\clase6\class-06-starter\database\migrations\001_create_users.sql
* FOUND: activities\clase6\class-06-starter\database\migrations\002_create_requests.sql
* FOUND: activities\clase6\class-06-starter\database\migrations\003_create_request_history.sql
* FOUND: activities\clase6\class-06-starter\database\migrations\004_add_constraints_and_indexes.sql
* FOUND: activities\clase6\class-06-starter\package-lock.json
* FOUND: activities\clase6\class-06-starter\package.json
* FOUND: activities\clase6\class-06-starter\recovery\README.md
* … 47 archivo(s) más con el mismo patrón

Extracto de activities\clase6\class-06-starter\activities\class-06\work-log.md (redactado automáticamente):

```text
# Class 06 work log

## Environment

What did I configure?
Which command confirmed that it worked?

## Request flow

Where does the request enter?
Where is authentication checked?
Where is authorization checked?
Where is PostgreSQL accessed?

## Bug fixed

What was happening?
What should happen?
Which file did I modify?
Which test protects the behavior?

## Feature implemented

What does GET /requests/:id/history do?
Who can use it?
How is the result ordered?

## Test explained

Choose one test.
[... 16 líneas más]
```

Extracto de activities\clase6\class-06-starter\activities\class-06\validation-evidence.txt (redactado automáticamente):

```text
Pega aqui la salida final de: npm run validate:class-06
(la salida no contiene secretos; no agregues capturas de tu .env)

```

### Clase 07 — Diagnóstico y errores

* FOUND: activities\class-08-starter\scripts\validate-class-07.js
* FOUND: activities\class-08-starter\src\middleware\error-handler.js
* FOUND: activities\class-08-starter\src\middleware\request-id.js
* FOUND: clase-7\class-07-starter\.gitignore
* FOUND: clase-7\class-07-starter\README.md
* FOUND: clase-7\class-07-starter\activities\class-07\README.md
* FOUND: clase-7\class-07-starter\activities\class-07\incident-report.md
* FOUND: clase-7\class-07-starter\activities\class-07\validation-evidence.txt — salida guardada, NOT_VERIFIED como ejecución
* FOUND: clase-7\class-07-starter\database\migrations\001_create_users.sql
* FOUND: clase-7\class-07-starter\database\migrations\002_create_requests.sql
* FOUND: clase-7\class-07-starter\database\migrations\003_create_request_history.sql
* FOUND: clase-7\class-07-starter\database\migrations\004_add_constraints_and_indexes.sql
* … 51 archivo(s) más con el mismo patrón

Extracto de clase-7\class-07-starter\activities\class-07\incident-report.md (redactado automáticamente):

```text
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
[... 313 líneas más]
```

Extracto de clase-7\class-07-starter\activities\class-07\validation-evidence.txt (redactado automáticamente):

```text

> class-07-request-api@7.0.0 validate:class-07
> node scripts/validate-class-07.js

CLASS 07 INCIDENT VALIDATION

Baseline
[01/12] Existing contract preserved .......... PASS

Input and errors
[02/12] Invalid id returns 400 ............... PASS
[03/12] Invalid priority returns 400 ......... PASS
[04/12] Unknown request returns 404 .......... PASS
[05/12] Invalid transition returns 409 ....... PASS
[06/12] Unexpected errors return 500 ......... PASS
[07/12] Internal details remain hidden ....... PASS

Traceability
[08/12] Response contains request id ......... PASS
[09/12] Log contains the same request id ..... PASS
[10/12] Authorization header is not logged ... PASS

Operation
[11/12] Health endpoint responds ............. PASS
[12/12] Readiness checks PostgreSQL .......... PASS

Cleanup
Temporary validation data removed successfully.

FINAL RESULT: PASSED
[... 1 líneas más]
```

## Estado previo a la clase 8

* Validadores disponibles (clases 1-7): activities\clase6\class-06-starter\scripts\validate-class-06.js, activities\class-08-starter\scripts\validate-class-06.js, activities\class-08-starter\scripts\validate-class-07.js, clase 5\request-api-v5-starter\scripts\validate-class-05.js, clase-7\class-07-starter\scripts\validate-class-06.js, clase-7\class-07-starter\scripts\validate-class-07.js, clase6\scripts\validate-class-06.js
* Carpetas de pruebas: NOT_FOUND
* Último commit antes del taller: cf39418

## Cuestionario diagnóstico (responde aquí, 3-6 líneas cada una)

Sé específico: cita archivos o rutas concretas de TU proyecto cuando puedas. La extensión no suma.

### Pregunta clase 01

Describe qué ocurre desde que una petición llega al backend hasta que sale una respuesta y explica por qué el servidor debe permanecer activo.

Respuesta: [COMPLETAR]

### Pregunta clase 02

Elige un endpoint del proyecto y explica cómo método, ruta, body y status forman su contrato.

Respuesta: [COMPLETAR]

### Pregunta clase 03

Explica, usando una solicitud del proyecto, la diferencia entre representación, dato inválido y transición incompatible con el estado actual.

Respuesta: [COMPLETAR]

### Pregunta clase 04

Explica la diferencia entre migración, seed y transacción, e indica dónde aparece cada concepto en el proyecto.

Respuesta: [COMPLETAR]

### Pregunta clase 05

Explica la diferencia entre autenticación y autorización y por qué un JWT decodificado todavía debe verificarse.

Respuesta: [COMPLETAR]

### Pregunta clase 06

Elige una prueba del proyecto, identifica preparación, acción y comprobación, y explica qué regresión protege.

Respuesta: [COMPLETAR]

### Pregunta clase 07

Describe un fallo investigado distinguiendo síntoma, hipótesis y causa; luego indica qué señal correspondería a health o readiness.

Respuesta: [COMPLETAR]

---
Nota de seguridad: este paquete fue generado excluyendo .env y redactando
posibles secretos. Revisa una vez más antes de pegarlo en un modelo:
si ves una credencial real, reemplázala por [REDACTED] y avisa al docente.
